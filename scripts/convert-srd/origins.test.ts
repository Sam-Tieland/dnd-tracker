import { beforeAll, describe, expect, it } from 'vitest';
import { convertOrigins, type OriginConversion } from './origins';
import { readVendor } from './vendor';

let result: OriginConversion;
beforeAll(() => {
  result = convertOrigins(readVendor('character-origins.md'));
});

describe('backgrounds', () => {
  it('finds the four SRD backgrounds', () => {
    expect(result.backgrounds.map((b) => b.name)).toEqual(['Acolyte', 'Criminal', 'Sage', 'Soldier']);
  });

  it('reads abilities, feat, skills and tool', () => {
    const [acolyte, criminal, , soldier] = result.backgrounds;
    expect(acolyte).toMatchObject({
      id: 'srd:background:acolyte',
      abilityOptions: ['int', 'wis', 'cha'],
      featId: 'srd:feat:magic-initiate',
      featNote: 'Cleric',
      skillProficiencies: ['insight', 'religion'],
      toolText: "Calligrapher's Supplies",
    });
    expect(criminal).toMatchObject({ featId: 'srd:feat:alert', featNote: undefined, skillProficiencies: ['sleight-of-hand', 'stealth'] });
    expect(soldier.abilityOptions).toEqual(['str', 'dex', 'con']);
    expect(soldier.equipmentText).toContain('GP');
  });
});

describe('species', () => {
  it('finds the nine SRD species with their speed', () => {
    expect(result.species.map((s) => s.name)).toEqual(['Dragonborn', 'Dwarf', 'Elf', 'Gnome', 'Goliath', 'Halfling', 'Human', 'Orc', 'Tiefling']);
    expect(result.species.map((s) => s.speed)).toEqual([30, 30, 30, 30, 35, 30, 30, 30, 30]);
  });

  it('turns traits into features', () => {
    const dwarf = result.species.find((s) => s.id === 'srd:species:dwarf')!;
    expect(dwarf.traitIds).toEqual([
      'srd:feature:dwarf:darkvision',
      'srd:feature:dwarf:dwarven-resilience',
      'srd:feature:dwarf:dwarven-toughness',
      'srd:feature:dwarf:stonecunning',
    ]);
    const stonecunning = result.features.find((f) => f.id === 'srd:feature:dwarf:stonecunning')!;
    expect(stonecunning.text).toContain('Proficiency Bonus');
    expect(dwarf.text).not.toContain('**Speed:**');
    expect(dwarf.creatureType).toBe('Humanoid');
  });
});
