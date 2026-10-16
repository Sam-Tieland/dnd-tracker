import { describe, expect, it } from 'vitest';
import { splitSections } from '../../scripts/convert-srd/markdown';
import { tableAfter } from '../../scripts/convert-srd/tables';
import { readVendor } from '../../scripts/convert-srd/vendor';
import { ABILITY_BY_NAME, SKILLS, SPEED_ZERO_CONDITIONS } from './constants';
import { slugify } from './ids';

describe('SKILLS', () => {
  it('matches the Skills table in the SRD', () => {
    const table = tableAfter(readVendor('playing-the-game.md'), 'Skills');
    const fromSrd = Object.fromEntries(table.body.map((row) => [slugify(row[0].text), ABILITY_BY_NAME[row[1].text]]));
    expect(fromSrd).toEqual(SKILLS);
  });
});

describe('SPEED_ZERO_CONDITIONS', () => {
  it('are exactly the conditions whose glossary entry says Speed 0', () => {
    const fromGlossary = splitSections(readVendor('rules-glossary.md'), 4)
      .filter((s) => s.title.endsWith('[Condition]') && s.body.includes('_Speed 0._'))
      .map((s) => s.title.replace(' [Condition]', '').toLowerCase());
    expect(fromGlossary).toEqual([...SPEED_ZERO_CONDITIONS]);
  });
});
