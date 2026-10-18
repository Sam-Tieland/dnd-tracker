import { describe, expect, it, vi } from 'vitest';
import type { PdfHandle } from './pdf';
import { fitScale, nearestZoom, parseGoTo, scrollForHalf, serialRenders, stepZoom, Superseded, ZOOM_STEPS } from './reader-logic';

describe('reader logic', () => {
  it('fits the page width into the reading area', () => {
    expect(fitScale(1000, 800)).toBe(0.8);
    expect(fitScale(612, 612)).toBe(1);
  });

  it('scrolls to the right half of a spread only when there is something to scroll', () => {
    expect(scrollForHalf('right', 1600, 800)).toBe(800);
    expect(scrollForHalf('left', 1600, 800)).toBe(0);
    expect(scrollForHalf('whole', 1600, 800)).toBe(0);
    expect(scrollForHalf('right', 600, 800)).toBe(0);
  });

  it('reads a page number from the go-to field', () => {
    expect(parseGoTo(' 34 ')).toBe(34);
    expect(parseGoTo('0')).toBeUndefined();
    expect(parseGoTo('-3')).toBeUndefined();
    expect(parseGoTo('3a')).toBeUndefined();
    expect(parseGoTo('')).toBeUndefined();
    expect(parseGoTo('1.5')).toBeUndefined();
  });

  it('steps and snaps the zoom to the fixed steps', () => {
    expect(ZOOM_STEPS[0]).toBe(1);
    expect(stepZoom(1, 1)).toBe(1.25);
    expect(stepZoom(1, -1)).toBe(1);
    expect(stepZoom(4, 1)).toBe(4);
    expect(stepZoom(2, -1)).toBe(1.5);
    expect(nearestZoom(1.9)).toBe(2);
    expect(nearestZoom(0.3)).toBe(1);
    expect(nearestZoom(9)).toBe(4);
  });
});

describe('serialRenders', () => {
  function fakeHandle() {
    const finishers: Array<() => void> = [];
    const calls: number[] = [];
    let active = 0;
    let overlap = false;
    const handle: PdfHandle = {
      pageCount: 10,
      pageSize: async () => ({ width: 100, height: 100 }),
      render: (pdfPage) => {
        calls.push(pdfPage);
        active++;
        if (active > 1) overlap = true;
        return new Promise<void>((resolve) =>
          finishers.push(() => {
            active--;
            resolve();
          }),
        );
      },
      destroy: vi.fn(async () => undefined),
    };
    return { handle, calls, finishers, overlap: () => overlap };
  }
  const canvas = {} as HTMLCanvasElement;
  const flush = () => new Promise((r) => setTimeout(r, 0));

  it('runs one render at a time and only the latest waiting page', async () => {
    const fake = fakeHandle();
    const serial = serialRenders(fake.handle);
    const first = serial.render(1, canvas, 1);
    const second = serial.render(2, canvas, 1);
    const third = serial.render(3, canvas, 1);
    await expect(second).rejects.toBeInstanceOf(Superseded);
    expect(fake.calls).toEqual([1]);
    fake.finishers[0]!();
    await first;
    await flush();
    expect(fake.calls).toEqual([1, 3]);
    fake.finishers[1]!();
    await third;
    expect(fake.overlap()).toBe(false);
  });

  it('waits for a running render before destroying the document', async () => {
    const fake = fakeHandle();
    const serial = serialRenders(fake.handle);
    const running = serial.render(1, canvas, 1);
    const waiting = serial.render(2, canvas, 1);
    const destroyed = serial.destroy();
    await expect(waiting).rejects.toBeInstanceOf(Superseded);
    await flush();
    expect(fake.handle.destroy).not.toHaveBeenCalled();
    fake.finishers[0]!();
    await running;
    await destroyed;
    expect(fake.handle.destroy).toHaveBeenCalledOnce();
    await expect(serial.render(3, canvas, 1)).rejects.toBeInstanceOf(Superseded);
    expect(fake.calls).toEqual([1]);
  });

  it('passes a failed render on to its caller and keeps going', async () => {
    const fake = fakeHandle();
    const failing: PdfHandle = { ...fake.handle, render: async () => Promise.reject(new Error('broken')) };
    const serial = serialRenders(failing);
    await expect(serial.render(1, canvas, 1)).rejects.toThrow('broken');
    await expect(serial.render(2, canvas, 1)).rejects.toThrow('broken');
  });
});
