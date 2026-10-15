import { contentId } from '../../src/content/ids';
import type { ArmorDef, GearDef, WeaponDef } from '../../src/content/schema';
import { requireSection, splitSections, toInt } from './markdown';
import { isSectionRow, tableAfter } from './tables';

export interface EquipmentConversion {
  weapons: WeaponDef[];
  armor: ArmorDef[];
  gear: GearDef[];
}

function weaponSection(label: string): Pick<WeaponDef, 'category' | 'kind'> {
  const match = /^(Simple|Martial) (Melee|Ranged) Weapons$/.exec(label);
  if (!match) throw new Error(`weapons: unexpected section "${label}"`);
  return {
    category: match[1].toLowerCase() as WeaponDef['category'],
    kind: match[2].toLowerCase() as WeaponDef['kind'],
  };
}

function convertWeapons(body: string): WeaponDef[] {
  const weapons: WeaponDef[] = [];
  let section: Pick<WeaponDef, 'category' | 'kind'> | undefined;
  for (const row of tableAfter(body, 'Weapons').body) {
    if (isSectionRow(row)) {
      section = weaponSection(row[0].text);
      continue;
    }
    if (!section) throw new Error('weapons: row before the first section');
    const [name, damage, properties, mastery, weight, cost] = row.map((cell) => cell.text);
    const parsed = /^(\S+) (.+)$/.exec(damage);
    if (!parsed) throw new Error(`weapon ${name}: unexpected damage "${damage}"`);
    weapons.push({
      id: contentId('srd', 'weapon', name),
      type: 'weapon',
      source: 'srd',
      name,
      ...section,
      damageDice: parsed[1],
      damageType: parsed[2],
      properties: properties === '—' ? [] : properties.split(/,\s*/),
      mastery,
      weight,
      cost,
    });
  }
  return weapons;
}

function convertArmor(body: string): ArmorDef[] {
  const armor: ArmorDef[] = [];
  let category: ArmorDef['category'] | undefined;
  for (const row of tableAfter(body, 'Armor').body) {
    if (isSectionRow(row)) {
      category = row[0].text.split(' ')[0].toLowerCase() as ArmorDef['category'];
      continue;
    }
    const [name, ac, strength, stealth, weight, cost] = row.map((cell) => cell.text);
    const parsed = /^\+?(\d+)(?: \+ Dex modifier(?: \(max (\d+)\))?)?$/.exec(ac);
    if (!parsed || !category) throw new Error(`armor ${name}: unexpected row`);
    armor.push({
      id: contentId('srd', 'armor', name),
      type: 'armor',
      source: 'srd',
      name,
      category,
      baseAC: Number(parsed[1]),
      dexCap: ac.includes('Dex modifier') ? (parsed[2] ? Number(parsed[2]) : null) : 0,
      strength: strength === '—' ? undefined : toInt(strength),
      stealthDisadvantage: stealth === 'Disadvantage',
      weight,
      cost,
    });
  }
  return armor;
}

function convertGear(body: string): GearDef[] {
  return splitSections(body, 4)
    .filter((s) => s.title !== '')
    .map((entry): GearDef => {
      const match = /^(.+?) \(([^()]+)\)$/.exec(entry.title);
      const name = match ? match[1] : entry.title;
      return { id: contentId('srd', 'gear', name), type: 'gear', source: 'srd', name, cost: match ? match[2] : '', text: entry.body };
    });
}

export function convertEquipment(md: string): EquipmentConversion {
  const top = splitSections(md, 2);
  return {
    weapons: convertWeapons(requireSection(top, 'Weapons', 'equipment').body),
    armor: convertArmor(requireSection(top, 'Armor', 'equipment').body),
    gear: convertGear(requireSection(top, 'Adventuring Gear', 'equipment').body),
  };
}
