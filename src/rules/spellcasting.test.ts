import { describe, expect, it } from 'vitest';
import { casterLevel, MULTICLASS_SLOTS, slotsForCasterLevel, type CasterSource } from './spellcasting';
import { registry } from './testing/fixtures';

const source = (progression: CasterSource['progression'], classLevel: number): CasterSource => ({
  classId: `srd:class:${progression}`, ability: 'int', progression, classLevel,
});

describe('Multiclass Spellcaster table', () => {
  it('has 20 rows', () => {
    expect(MULTICLASS_SLOTS).toHaveLength(20);
  });

  it('gives every single-class SRD caster exactly the slots of its own class table', () => {
    for (const cls of registry.list('class')) {
      if (!cls.spellcasting || cls.spellcasting.progression === 'pact') continue;
      cls.slotsByLevel!.forEach((row, index) => {
        const fromRule = slotsForCasterLevel(casterLevel([{ classId: cls.id, ability: cls.spellcasting!.ability, progression: cls.spellcasting!.progression, classLevel: index + 1 }]));
        const padded = [...fromRule, ...Array(Math.max(0, row.length - fromRule.length)).fill(0)];
        expect(padded, `${cls.name} level ${index + 1}`).toEqual(row);
      });
    }
  });
});

describe('casterLevel', () => {
  it.each<[string, CasterSource[], number]>([
    ['single full caster', [source('full', 5)], 5],
    ['single half caster rounds up', [source('half', 3)], 2],
    ['single third caster rounds up (PHB)', [source('third', 7)], 3],
    ['full + half (half rounds up)', [source('full', 3), source('half', 3)], 5],
    ['two half casters', [source('half', 3), { ...source('half', 3), classId: 'srd:class:other' }], 4],
    ['full + third (third rounds down, PHB)', [source('full', 2), source('third', 7)], 4],
    ['pact magic does not count', [source('pact', 5)], 0],
    ['pact + full counts the full caster as single', [source('pact', 3), source('full', 2)], 2],
  ])('%s', (_name, sources, expected) => {
    expect(casterLevel(sources)).toBe(expected);
  });

  it('gives no slots at caster level 0', () => {
    expect(slotsForCasterLevel(0)).toEqual([]);
  });
});
