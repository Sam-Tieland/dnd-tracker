import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSaveQueue } from './save-queue';

describe('createSaveQueue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('saves only the latest value after a quiet period', async () => {
    const save = vi.fn(async (_value: number) => {});
    const queue = createSaveQueue(save, () => {}, 400);
    queue.push(1);
    queue.push(2);
    queue.push(3);
    await vi.advanceTimersByTimeAsync(399);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(save.mock.calls).toEqual([[3]]);
  });

  it('flush saves right away, e.g. when the app goes to the background', async () => {
    const save = vi.fn(async (_value: number) => {});
    const queue = createSaveQueue(save, () => {}, 400);
    queue.push(7);
    await queue.flush();
    expect(save.mock.calls).toEqual([[7]]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('reports a failed save and tries it again on the next flush', async () => {
    const errors: unknown[] = [];
    const save = vi.fn(async (_value: number) => {}).mockRejectedValueOnce(new Error('QuotaExceededError'));
    const queue = createSaveQueue(save, (error) => errors.push(error), 400);
    queue.push(5);
    await queue.flush();
    expect(errors).toHaveLength(1);
    await queue.flush();
    expect(save.mock.calls).toEqual([[5], [5]]);
  });

  it('a newer value replaces one that failed', async () => {
    const save = vi.fn(async (_value: number) => {}).mockRejectedValueOnce(new Error('busy'));
    const queue = createSaveQueue(save, () => {}, 400);
    queue.push(5);
    await queue.flush();
    queue.push(6);
    await queue.flush();
    expect(save.mock.calls).toEqual([[5], [6]]);
  });

  describe('while a write is still running', () => {
    const deferred = () => {
      let resolve!: () => void;
      let reject!: (error: unknown) => void;
      const promise = new Promise<void>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };

    it('flush waits for a write the timer started', async () => {
      const first = deferred();
      const save = vi.fn((_value: number) => first.promise);
      const queue = createSaveQueue(save, () => {}, 400);
      queue.push(1);
      await vi.advanceTimersByTimeAsync(400);
      expect(save.mock.calls).toEqual([[1]]);
      let flushed = false;
      const flushing = queue.flush().then(() => {
        flushed = true;
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(flushed).toBe(false);
      first.resolve();
      await flushing;
      expect(flushed).toBe(true);
    });

    it('never runs two writes at once and writes in the order the values were pushed', async () => {
      const writes = [deferred(), deferred()];
      let running = 0;
      let mostAtOnce = 0;
      const save = vi.fn(async (_value: number) => {
        running += 1;
        mostAtOnce = Math.max(mostAtOnce, running);
        try {
          await writes[save.mock.calls.length - 1].promise;
        } finally {
          running -= 1;
        }
      });
      const queue = createSaveQueue(save, () => {}, 400);
      queue.push(1);
      await vi.advanceTimersByTimeAsync(400);
      queue.push(2);
      const flushing = queue.flush();
      await vi.advanceTimersByTimeAsync(0);
      expect(save.mock.calls).toEqual([[1]]);
      writes[0].resolve();
      await vi.advanceTimersByTimeAsync(0);
      expect(save.mock.calls).toEqual([[1], [2]]);
      writes[1].resolve();
      await flushing;
      expect(mostAtOnce).toBe(1);
    });

    it('does not write an older value again when it fails after a newer one was pushed', async () => {
      const errors: unknown[] = [];
      const first = deferred();
      const save = vi.fn(async (_value: number) => {}).mockImplementationOnce(() => first.promise);
      const queue = createSaveQueue(save, (error) => errors.push(error), 400);
      queue.push(1);
      await vi.advanceTimersByTimeAsync(400);
      queue.push(2);
      const flushing = queue.flush();
      first.reject(new Error('A failed'));
      await flushing;
      expect(errors).toHaveLength(1);
      expect(save.mock.calls).toEqual([[1], [2]]);
      await queue.flush();
      await vi.advanceTimersByTimeAsync(1000);
      expect(save.mock.calls).toEqual([[1], [2]]);
    });

    it('keeps the newest value for the next try when the older and the newer write both fail', async () => {
      const errors: unknown[] = [];
      const writes = [deferred(), deferred()];
      const save = vi
        .fn(async (_value: number) => {})
        .mockImplementationOnce(() => writes[0].promise)
        .mockImplementationOnce(() => writes[1].promise);
      const queue = createSaveQueue(save, (error) => errors.push(error), 400);
      queue.push(1);
      await vi.advanceTimersByTimeAsync(400);
      queue.push(2);
      const flushing = queue.flush();
      writes[0].reject(new Error('A failed'));
      await vi.advanceTimersByTimeAsync(0);
      writes[1].reject(new Error('B failed'));
      await flushing;
      expect(errors).toHaveLength(2);
      expect(save.mock.calls).toEqual([[1], [2]]);
      await queue.flush();
      expect(save.mock.calls).toEqual([[1], [2], [2]]);
      await queue.flush();
      expect(save).toHaveBeenCalledTimes(3);
    });

    it('still resolves and keeps saving when the error reporter throws', async () => {
      const save = vi.fn(async (_value: number) => {}).mockRejectedValueOnce(new Error('busy'));
      const queue = createSaveQueue(save, () => {
        throw new Error('reporter broke');
      }, 400);
      queue.push(1);
      await expect(queue.flush()).resolves.toBeUndefined();
      await queue.flush();
      expect(save.mock.calls).toEqual([[1], [1]]);
    });
  });
});
