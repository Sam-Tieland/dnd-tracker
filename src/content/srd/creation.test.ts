import { describe, expect, it } from 'vitest';
import { tableAfter } from '../../../scripts/convert-srd/tables';
import { readVendor } from '../../../scripts/convert-srd/vendor';
import { POINT_BUY_BUDGET, POINT_BUY_COST, STANDARD_ARRAY, pointBuyCost } from './creation';

const md = readVendor('character-creation.md');

describe('character creation numbers', () => {
  it('standard array comes from the SRD', () => {
    expect(md).toContain(`_Standard Array._ Use the following six scores for your abilities: ${STANDARD_ARRAY.join(', ')}.`);
  });

  it('point buy budget and costs come from the SRD', () => {
    expect(md).toContain(`You have ${POINT_BUY_BUDGET} points to spend on your ability scores.`);
    const fromTable: Record<number, number> = {};
    for (const row of tableAfter(md, 'Ability Score Point Costs').body) {
      for (let i = 0; i < row.length; i += 2) fromTable[Number(row[i].text)] = Number(row[i + 1].text);
    }
    expect(fromTable).toEqual(POINT_BUY_COST);
  });

  it('counts point buy costs and refuses scores outside 8–15', () => {
    expect(pointBuyCost({ str: 15, dex: 15, con: 15, int: 8, wis: 8, cha: 8 })).toBe(27);
    expect(pointBuyCost({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 })).toBe(0);
    expect(pointBuyCost({ str: 16, dex: 8, con: 8, int: 8, wis: 8, cha: 8 })).toBeUndefined();
  });
});
