import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSaveQueue } from '../../storage/save-queue';

type Session = typeof import('./session');

/** The pending flushes are module state; every test starts from a fresh copy of the module. */
let session: Session;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  session = await import('./session');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('whenSaved', () => {
  it('resolves at once when nothing is being saved', async () => {
    let done = false;
    void session.whenSaved().then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('waits for a flush that has started and resolves when the write has finished', async () => {
    let finishWrite!: () => void;
    const queue = createSaveQueue<number>(
      () => new Promise<void>((resolve) => (finishWrite = resolve)),
      () => {},
    );
    queue.push(1);
    session.startFlush(queue);
    let done = false;
    void session.whenSaved().then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(1500);
    expect(done).toBe(false);
    finishWrite();
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(true);
    // Neither the save timer nor the 2 second limit is left running.
    expect(vi.getTimerCount()).toBe(0);
  });

  it('gives up after 2 seconds when a write never finishes, so the form cannot hang', async () => {
    const queue = createSaveQueue<number>(
      () => new Promise<void>(() => {}),
      () => {},
    );
    queue.push(1);
    session.startFlush(queue);
    let done = false;
    void session.whenSaved().then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(1999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
  });
});
