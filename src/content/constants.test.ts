import { describe, expect, it } from 'vitest';
import { tableAfter } from '../../scripts/convert-srd/tables';
import { readVendor } from '../../scripts/convert-srd/vendor';
import { ABILITY_BY_NAME, SKILLS } from './constants';
import { slugify } from './ids';

describe('SKILLS', () => {
  it('matches the Skills table in the SRD', () => {
    const table = tableAfter(readVendor('playing-the-game.md'), 'Skills');
    const fromSrd = Object.fromEntries(table.body.map((row) => [slugify(row[0].text), ABILITY_BY_NAME[row[1].text]]));
    expect(fromSrd).toEqual(SKILLS);
  });
});
