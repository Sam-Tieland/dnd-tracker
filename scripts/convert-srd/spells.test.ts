import { beforeAll, describe, expect, it } from 'vitest';
import type { SpellDef } from '../../src/content/schema';
import { convertSpells } from './spells';
import { readVendor } from './vendor';

let spells: SpellDef[];
beforeAll(() => {
  spells = convertSpells(readVendor('spells.md'));
});
const spell = (name: string) => spells.find((s) => s.name === name)!;

describe('convertSpells', () => {
  it('finds all 339 spells, 27 of them cantrips', () => {
    expect(spells).toHaveLength(339);
    expect(spells.filter((s) => s.level === 0)).toHaveLength(27);
    expect(new Set(spells.map((s) => s.id)).size).toBe(339);
  });

  it('reads the header and properties', () => {
    const fireball = spell('Fireball');
    expect(fireball).toMatchObject({
      id: 'srd:spell:fireball',
      level: 3,
      school: 'Evocation',
      classes: ['srd:class:sorcerer', 'srd:class:wizard'],
      castingTime: 'Action',
      range: '150 feet',
      components: 'V, S, M (a ball of bat guano and sulfur)',
      duration: 'Instantaneous',
      ritual: false,
      concentration: false,
    });
    expect(fireball.text.startsWith('A bright streak')).toBe(true);
    expect(fireball.text).toContain('_Using a Higher-Level Spell Slot._');
    expect(fireball.cantrip).toBeUndefined();
  });

  it('detects ritual and concentration', () => {
    expect(spell('Detect Magic')).toMatchObject({ level: 1, ritual: true, concentration: true });
    expect(spell('Detect Magic').classes).toHaveLength(8);
  });

  it('extracts cantrip damage, attack type and scaling', () => {
    expect(spell('Fire Bolt').cantrip).toEqual({ damageDice: '1d10', damageType: 'Fire', attackType: 'attack', saveAbility: undefined, scales: true });
    expect(spell('Sacred Flame').cantrip).toEqual({ damageDice: '1d8', damageType: 'Radiant', attackType: 'save', saveAbility: 'dex', scales: true });
    expect(spell('Eldritch Blast').cantrip).toMatchObject({ damageDice: '1d10', damageType: 'Force', attackType: 'attack', scales: false });
  });

  it('keeps stat block headings inside the spell they belong to', () => {
    expect(spell('Find Steed').text).toContain('#### Traits');
    expect(spells.some((s) => s.name === 'Traits')).toBe(false);
  });
});
