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
});
