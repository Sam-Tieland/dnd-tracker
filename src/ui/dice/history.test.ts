import { describe, expect, it } from 'vitest';
import { addEntry, describeD20, describeRoll, type DiceEntry } from './history';

const d20 = (rolls: number[], kept: number, bonus: number) => ({ rolls, kept, bonus, total: kept + bonus, natural20: false, natural1: false });

describe('dice history', () => {
  it('keeps the 20 newest rolls, newest first (spec §10)', () => {
    let history: DiceEntry[] = [];
    for (let i = 1; i <= 25; i += 1) history = addEntry(history, { id: i, label: `roll ${i}`, total: i, detail: '' });
    expect(history).toHaveLength(20);
    expect([history[0].id, history[19].id]).toEqual([25, 6]);
  });

  it('describes d20 tests, with both dice under Advantage or Disadvantage', () => {
    expect(describeD20(d20([14], 14, 5), 'normal')).toBe('d20 (14) +5');
    expect(describeD20(d20([9, 14], 14, -1), 'advantage')).toBe('d20 Advantage (9, 14) -1');
    expect(describeD20(d20([9, 14], 9, 0), 'disadvantage')).toBe('d20 Disadvantage (9, 14)');
  });

  it('describes free rolls die by die', () => {
    expect(describeRoll({ expression: '2d6+3', dice: [{ sides: 6, value: 4, sign: 1 }, { sides: 6, value: 6, sign: 1 }], modifier: 3, total: 13 })).toBe('2d6+3: 4 + 6 + 3');
    expect(describeRoll({ expression: '1d4-1d4-2', dice: [{ sides: 4, value: 3, sign: 1 }, { sides: 4, value: 1, sign: -1 }], modifier: -2, total: 0 })).toBe('1d4-1d4-2: 3 - 1 - 2');
    expect(describeRoll({ expression: '5', dice: [], modifier: 5, total: 5 })).toBe('5: 5');
  });
});
