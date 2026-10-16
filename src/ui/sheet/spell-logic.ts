import type { Ability } from '../../content/constants';
import type { Character } from '../../model/character';
import type { DerivedSheet } from '../../rules/types';
import { titleCase } from '../format';

export type SpellEntry = Character['choices']['spells'][number];

/** The same spell from the same list with the same ability is added once. */
export function addSpell(spells: readonly SpellEntry[], entry: SpellEntry): SpellEntry[] {
  const same = (s: SpellEntry) => s.spellId === entry.spellId && s.classId === entry.classId && s.ability === entry.ability;
  return spells.some(same) ? [...spells] : [...spells, entry];
}

export function removeSpell(spells: readonly SpellEntry[], index: number): SpellEntry[] {
  return spells.filter((_, i) => i !== index);
}

export function setPrepared(spells: readonly SpellEntry[], index: number, prepared: boolean): SpellEntry[] {
  return spells.map((s, i) => (i === index ? { ...s, prepared } : s));
}

/** SRD Magic Initiate: the Cleric, Druid or Wizard spell list, with Intelligence, Wisdom or Charisma (checked in the test). */
export const MAGIC_INITIATE_LISTS = ['srd:class:cleric', 'srd:class:druid', 'srd:class:wizard'];
export const MAGIC_INITIATE_ABILITIES: Ability[] = ['int', 'wis', 'cha'];

/** Columns the sheet already shows elsewhere (proficiency bonus, spell counts, slots). */
export const HIDDEN_COLUMNS: ReadonlySet<string> = new Set(['proficiency-bonus', 'cantrips', 'prepared-spells', 'spell-slots', 'slot-level']);

/** Class table values at the current class level, e.g. "Barbarian: Rage Damage" +2 or "Rogue: Sneak Attack" 2d6. */
export function playColumns(sheet: DerivedSheet): Array<{ key: string; label: string; value: string }> {
  return sheet.classLevels.flatMap((cl) =>
    Object.entries(cl.columns)
      .filter(([key]) => !HIDDEN_COLUMNS.has(key))
      .map(([key, value]) => ({ key: `${cl.classId}:${key}`, label: `${cl.name}: ${titleCase(key)}`, value })),
  );
}
