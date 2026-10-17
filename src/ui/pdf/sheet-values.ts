import { ABILITIES, SKILL_IDS } from '../../content/constants';
import type { ContentRegistry } from '../../content/registry';
import type { Character, InventoryItem } from '../../model/character';
import { deriveSheet } from '../../rules/derive';
import type { AttackResult, DerivedSheet } from '../../rules/types';
import { classSummary, formatMod, titleCase } from '../format';
import {
  ABILITY_FIELDS,
  COMBAT_FIELDS,
  DEATH_SAVE_CHECKS,
  HEADER_FIELDS,
  PAGE2_FIELDS,
  SKILL_FIELDS,
  SLOT_FIELDS,
  SPELL_HEADER_FIELDS,
  SPELL_LINES,
  WEAPON_ROWS,
} from './sheet-fields';
import { toWinAnsi } from './win-ansi';

export interface SheetValues {
  /** Text per field name, already safe for the standard PDF font. */
  text: Record<string, string>;
  /** Names of the checkboxes that are ticked. */
  checks: string[];
}

type SpellKey = keyof typeof SPELL_LINES;
const SLOT_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function dice(entries: Array<{ count: number; die: number }>): string {
  return entries
    .filter((e) => e.count > 0)
    .map((e) => `${e.count}d${e.die}`)
    .join(' + ');
}

function itemName(entry: InventoryItem, registry: ContentRegistry): string {
  return entry.customName || (entry.itemId ? (registry.get(entry.itemId)?.name ?? entry.itemId) : '');
}

function speciesName(character: Character, sheet: DerivedSheet, registry: ContentRegistry): string {
  const { speciesId } = character.choices;
  const species = speciesId ? registry.getOf('species', speciesId) : undefined;
  if (!species) return '';
  const lineage = sheet.features.filter((f) => f.origin === 'option' && species.traitIds.includes(registry.getOf('feature', f.id)?.optionOf ?? ''));
  return lineage.length > 0 ? `${species.name} (${lineage.map((f) => f.name).join(', ')})` : species.name;
}

const attackDamage = (attack: AttackResult): string => [attack.damage, attack.damageType].filter(Boolean).join(' ');

function attackBonus(attack: AttackResult): string {
  if (attack.toHit !== undefined) return formatMod(attack.toHit);
  if (attack.saveDC !== undefined) return `DC ${attack.saveDC}${attack.saveAbility ? ` ${attack.saveAbility.toUpperCase()}` : ''}`;
  return '';
}

function attackLine(attack: AttackResult): string {
  return [attack.name, attackBonus(attack)].filter(Boolean).join(' ') + `, ${attackDamage(attack)}`;
}

function featureLines(sheet: DerivedSheet, registry: ContentRegistry): string[] {
  const owners: Array<{ owner: string; names: string[] }> = [];
  const nameWithOptions = (id: string, name: string) => {
    const options = sheet.features.filter((f) => f.origin === 'option' && registry.getOf('feature', f.id)?.optionOf === id).map((f) => f.name);
    return options.length > 0 ? `${name} (${options.join(', ')})` : name;
  };
  for (const feature of sheet.features) {
    if (feature.origin === 'feat' || feature.placeholder || feature.name === '') continue;
    // An option shows inside its parent feature when the parent is on the sheet, otherwise on its own.
    const parentId = feature.origin === 'option' ? registry.getOf('feature', feature.id)?.optionOf : undefined;
    if (parentId !== undefined && sheet.features.some((f) => f.id === parentId)) continue;
    let group = owners.find((o) => o.owner === feature.ownerName);
    if (!group) {
      group = { owner: feature.ownerName, names: [] };
      owners.push(group);
    }
    group.names.push(nameWithOptions(feature.id, feature.name));
  }
  const lines = owners.map((o) => (o.owner ? `${o.owner}: ${o.names.join(', ')}` : o.names.join(', ')));
  const masteries = [...new Set(sheet.attacks.filter((a) => a.mastery).map((a) => `${a.name} (${a.mastery})`))];
  if (masteries.length > 0) lines.push(`Weapon Mastery: ${masteries.join(', ')}`);
  return lines;
}

function proficiencyLines(character: Character, sheet: DerivedSheet): string[] {
  const lines: string[] = [];
  const add = (label: string, values: string[]) => {
    if (values.length > 0) lines.push(`${label}: ${values.join(', ')}`);
  };
  add('Armor', sheet.armorTraining.map(titleCase));
  add('Weapons', sheet.weaponProficiencies.map(titleCase));
  add('Tools', character.choices.toolProficiencies.map((t) => titleCase(t.replace(/^.*:/, ''))));
  add('Languages', character.choices.languages.map((l) => titleCase(l.replace(/^.*:/, ''))));
  return lines;
}

function slotValues(sheet: DerivedSheet): Record<number, { total: number; remaining: number }> {
  const slots: Record<number, { total: number; remaining: number }> = {};
  for (const slot of sheet.spellcasting.slots) {
    if (slot.level >= 1 && slot.level <= 9 && slot.max > 0) slots[slot.level] = { total: slot.max, remaining: slot.max - slot.used };
  }
  const pact = sheet.spellcasting.pact;
  if (pact && pact.slotLevel >= 1 && pact.slotLevel <= 9) {
    const base = slots[pact.slotLevel] ?? { total: 0, remaining: 0 };
    slots[pact.slotLevel] = { total: base.total + pact.slots, remaining: base.remaining + pact.slots - pact.used };
  }
  return slots;
}

/** The text and ticked boxes for the official character sheet. Never throws on unknown content. */
export function sheetValues(character: Character, registry: ContentRegistry): SheetValues {
  const sheet = deriveSheet(character, registry);
  const text: Record<string, string> = {};
  const checks: string[] = [];
  const put = (field: string, value: string) => {
    text[field] = value;
  };
  const tick = (field: string | undefined) => {
    if (field !== undefined) checks.push(field);
  };

  // Header and page 2
  const { backgroundId } = character.choices;
  put(HEADER_FIELDS.name, character.name);
  put(HEADER_FIELDS.name2, character.name);
  put(HEADER_FIELDS.classLevel, classSummary(sheet));
  put(HEADER_FIELDS.background, (backgroundId ? registry.getOf('background', backgroundId)?.name : undefined) ?? '');
  put(HEADER_FIELDS.species, speciesName(character, sheet, registry));
  put(HEADER_FIELDS.alignment, character.details.alignment ?? '');
  put(HEADER_FIELDS.inspiration, character.state.heroicInspiration ? 'X' : '');
  for (const field of [HEADER_FIELDS.player, HEADER_FIELDS.xp, COMBAT_FIELDS.ideals, COMBAT_FIELDS.bonds, COMBAT_FIELDS.flaws]) put(field, '');
  for (const field of [
    PAGE2_FIELDS.age,
    PAGE2_FIELDS.height,
    PAGE2_FIELDS.weight,
    PAGE2_FIELDS.eyes,
    PAGE2_FIELDS.skin,
    PAGE2_FIELDS.hair,
    PAGE2_FIELDS.allies,
    PAGE2_FIELDS.faction,
    PAGE2_FIELDS.treasure,
  ]) {
    put(field, '');
  }

  // Abilities, saves, skills
  for (const ability of ABILITIES) {
    const fields = ABILITY_FIELDS[ability];
    put(fields.score, String(sheet.abilities[ability].score));
    put(fields.mod, formatMod(sheet.abilities[ability].mod));
    put(fields.save, formatMod(sheet.saves[ability].bonus));
    if (sheet.saves[ability].proficient) tick(fields.saveCheck);
  }
  for (const id of SKILL_IDS) {
    const skill = sheet.skills[id];
    put(SKILL_FIELDS[id].value, formatMod(skill.bonus));
    if (skill.proficient || skill.expertise) tick(SKILL_FIELDS[id].check);
  }

  // Combat
  put(COMBAT_FIELDS.profBonus, formatMod(sheet.proficiencyBonus));
  put(COMBAT_FIELDS.ac, String(sheet.ac.value));
  put(COMBAT_FIELDS.initiative, formatMod(sheet.initiative));
  put(COMBAT_FIELDS.speed, `${sheet.speed} ft.`);
  put(COMBAT_FIELDS.hpMax, String(sheet.hp.max));
  put(COMBAT_FIELDS.hpCurrent, String(sheet.hp.current));
  put(COMBAT_FIELDS.hpTemp, sheet.hp.temp > 0 ? String(sheet.hp.temp) : '');
  put(COMBAT_FIELDS.hdTotal, dice(sheet.hitDice.map((h) => ({ count: h.total, die: h.die }))));
  put(COMBAT_FIELDS.hd, dice(sheet.hitDice.map((h) => ({ count: h.total - h.spent, die: h.die }))));
  put(COMBAT_FIELDS.passive, String(sheet.passivePerception));
  DEATH_SAVE_CHECKS.successes.slice(0, character.state.deathSaves.successes).forEach(tick);
  DEATH_SAVE_CHECKS.failures.slice(0, character.state.deathSaves.failures).forEach(tick);
  for (const coin of ['cp', 'sp', 'ep', 'gp', 'pp'] as const) put(COMBAT_FIELDS[coin], String(character.currency[coin]));

  // Attacks: the first three in the weapon rows, the rest and the spell numbers as text
  WEAPON_ROWS.forEach((row, index) => {
    const attack = sheet.attacks[index];
    put(row.name, attack?.name ?? '');
    put(row.bonus, attack ? attackBonus(attack) : '');
    put(row.damage, attack ? attackDamage(attack) : '');
  });
  const attackLines = sheet.attacks.slice(WEAPON_ROWS.length).map(attackLine);
  const first = sheet.spellcasting.classes[0];
  if (first) attackLines.push(`Spell save DC ${first.dc}, spell attack ${formatMod(first.attack)} (${first.ability.toUpperCase()})`);
  put(COMBAT_FIELDS.attacks, attackLines.join('\n'));

  // Text blocks
  put(COMBAT_FIELDS.proficiencies, proficiencyLines(character, sheet).join('\n'));
  put(
    COMBAT_FIELDS.equipment,
    character.inventory
      .map((entry) => `${entry.qty}x ${itemName(entry, registry)}${entry.equipped ? ' (equipped)' : ''}${entry.attuned ? ' (attuned)' : ''}`)
      .join('\n'),
  );
  put(COMBAT_FIELDS.features, featureLines(sheet, registry).join('\n'));
  put(
    PAGE2_FIELDS.feats,
    sheet.features
      .filter((f) => f.origin === 'feat' && f.name !== '')
      .map((f) => f.name)
      .join('\n'),
  );
  put(COMBAT_FIELDS.personality, character.details.personality ?? '');
  put(PAGE2_FIELDS.backstory, [character.details.appearance, character.details.backstory].filter((p): p is string => !!p).join('\n\n'));

  // Spell page
  put(SPELL_HEADER_FIELDS.spellClass, sheet.spellcasting.classes.map((c) => c.name).join(', '));
  put(SPELL_HEADER_FIELDS.ability, first ? first.ability.toUpperCase() : '');
  put(SPELL_HEADER_FIELDS.dc, first ? String(first.dc) : '');
  put(SPELL_HEADER_FIELDS.attack, first ? formatMod(first.attack) : '');
  const slots = slotValues(sheet);
  for (const level of SLOT_LEVELS) {
    const slot = slots[level];
    put(SLOT_FIELDS[level].total, slot ? String(slot.total) : '');
    put(SLOT_FIELDS[level].remaining, slot ? String(slot.remaining) : '');
  }
  const perLevel: Partial<Record<SpellKey, Array<{ name: string; prepared: boolean }>>> = {};
  const seen = new Set<string>();
  for (const entry of character.choices.spells) {
    const spell = registry.getOf('spell', entry.spellId);
    if (!spell || seen.has(entry.spellId)) continue;
    seen.add(entry.spellId);
    const key = (spell.level === 0 ? 'cantrips' : String(spell.level)) as SpellKey;
    (perLevel[key] ??= []).push({ name: spell.name, prepared: entry.prepared });
  }
  for (const key of Object.keys(SPELL_LINES) as SpellKey[]) {
    SPELL_LINES[key].forEach((line, index) => {
      const spell = perLevel[key]?.[index];
      put(line.name, spell?.name ?? '');
      if (spell?.prepared && key !== 'cantrips') tick(line.prepared);
    });
  }

  for (const field of Object.keys(text)) text[field] = toWinAnsi(text[field]);
  return { text, checks };
}
