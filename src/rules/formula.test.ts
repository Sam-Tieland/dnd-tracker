import { describe, expect, it } from 'vitest';
import type { Formula } from '../content/schema';
import { evalFormula, parseColumnNumber, type FormulaContext } from './formula';

const levelsByClass: Record<string, number> = { 'srd:class:fighter': 3, 'srd:class:wizard': 2 };
const ctx: FormulaContext = {
  pb: 3,
  mods: { str: 3, dex: 1, con: 2, int: 2, wis: 0, cha: -1 },
  totalLevel: 5,
  classLevel: (classId) => levelsByClass[classId] ?? 0,
  column: (classId, key) => (classId === 'srd:class:fighter' && key === 'second-wind' ? 2 : 0),
};

describe('evalFormula', () => {
  it.each<[Formula, number]>([
    [4, 4],
    [{ pb: true }, 3],
    [{ mod: 'str' }, 3],
    [{ mod: 'cha', min: 1 }, 1],
    [{ level: 'total' }, 5],
    [{ level: 'srd:class:fighter', times: 5 }, 15],
    [{ level: 'srd:class:paladin' }, 0],
    [{ column: { classId: 'srd:class:fighter', key: 'second-wind' } }, 2],
    [{ atLevel: { classId: 'srd:class:fighter', values: [[2, 1], [17, 2]] } }, 1],
    [{ atLevel: { classId: 'srd:class:fighter', values: [[9, 1]] } }, 0],
    [{ sum: [1, { pb: true }, { mod: 'dex' }] }, 5],
  ])('%j -> %i', (formula, expected) => {
    expect(evalFormula(formula, ctx)).toBe(expected);
  });
});

describe('parseColumnNumber', () => {
  it.each<[string | undefined, number]>([
    ['+10 ft.', 10],
    ['3', 3],
    ['—', 0],
    ['\u22123', -3],
    [undefined, 0],
  ])('%s -> %i', (text, expected) => expect(parseColumnNumber(text)).toBe(expected));
});
