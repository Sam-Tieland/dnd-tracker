import { describe, expect, it } from 'vitest';
import { UndoStack } from './undo';

describe('UndoStack', () => {
  it('keeps the last 20 changes and undoes the newest first (spec §8)', () => {
    const stack = new UndoStack<number>();
    for (let i = 1; i <= 25; i += 1) stack.push({ label: `change ${i}`, before: i });
    expect(stack.size).toBe(20);
    expect(stack.pop()).toEqual({ label: 'change 25', before: 25 });
    for (let i = 0; i < 19; i += 1) stack.pop();
    expect(stack.pop()).toBeUndefined();
  });
});
