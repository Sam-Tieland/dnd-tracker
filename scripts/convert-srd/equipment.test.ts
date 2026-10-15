import { describe, expect, it } from 'vitest';
import { convertEquipment } from './equipment';
import { readVendor } from './vendor';

describe('convertEquipment', () => {
  const { weapons, armor, gear } = convertEquipment(readVendor('equipment.md'));
  const weapon = (name: string) => weapons.find((w) => w.name === name)!;
  const armorPiece = (name: string) => armor.find((a) => a.name === name)!;

  it('finds 38 weapons, 13 armor entries and 81 pieces of gear', () => {
    expect(weapons).toHaveLength(38);
    expect(armor).toHaveLength(13);
    expect(gear).toHaveLength(81);
  });

  it('reads weapons with category, kind and properties', () => {
    expect(weapon('Longsword')).toMatchObject({
      id: 'srd:weapon:longsword', category: 'martial', kind: 'melee', damageDice: '1d8', damageType: 'Slashing',
      properties: ['Versatile (1d10)'], mastery: 'Sap',
    });
    expect(weapon('Dagger')).toMatchObject({ category: 'simple', properties: ['Finesse', 'Light', 'Thrown (Range 20/60)'], mastery: 'Nick' });
    expect(weapon('Blowgun')).toMatchObject({ category: 'martial', kind: 'ranged', damageDice: '1', damageType: 'Piercing' });
    expect(weapon('Longbow').properties).toEqual(['Ammunition (Range 150/600; Arrow)', 'Heavy', 'Two-Handed']);
  });

  it('reads armor AC, DEX cap, strength and stealth', () => {
    expect(armorPiece('Leather Armor')).toMatchObject({ category: 'light', baseAC: 11, dexCap: null, stealthDisadvantage: false });
    expect(armorPiece('Hide Armor')).toMatchObject({ category: 'medium', baseAC: 12, dexCap: 2, strength: undefined });
    expect(armorPiece('Chain Mail')).toMatchObject({ id: 'srd:armor:chain-mail', category: 'heavy', baseAC: 16, dexCap: 0, strength: 13, stealthDisadvantage: true });
    expect(armorPiece('Shield')).toMatchObject({ id: 'srd:armor:shield', category: 'shield', baseAC: 2 });
  });

  it('reads gear with cost', () => {
    expect(gear.find((g) => g.name === 'Backpack')).toMatchObject({ id: 'srd:gear:backpack', cost: '2 GP' });
    expect(gear.find((g) => g.name === 'Bottle, Glass')).toMatchObject({ id: 'srd:gear:bottle-glass', cost: '2 GP' });
    expect(new Set(gear.map((g) => g.id)).size).toBe(gear.length);
  });
});
