import type { Ability } from '../content/constants';
import type { ContentRegistry } from '../content/registry';
import type { Effect, Progression } from '../content/schema';
import type { Character } from '../model/character';
import type { BonusFn } from './bonuses';
import { parseColumnNumber } from './formula';
import type { AbilityResult, AttackResult, CasterStats, ClassLevel, SpellcastingResult, Warning } from './types';
import { unknownContent, warnOnce } from './warnings';

/** SRD 5.2.1 "Multiclass Spellcaster: Spell Slots per Spell Level", rows = caster level 1–20. */
export const MULTICLASS_SLOTS: readonly (readonly number[])[] = [
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

export function slotsForCasterLevel(level: number): number[] {
  if (level <= 0) return [];
  return [...MULTICLASS_SLOTS[Math.min(level, 20) - 1]];
}

export interface CasterSource {
  classId: string;
  ability: Ability;
  progression: Progression;
  classLevel: number;
}

/** Spellcasting from class definitions, plus `spellcasting` effects (Eldritch Knight, Arcane Trickster). */
export function spellcastingSources(classLevels: ClassLevel[], registry: ContentRegistry, effects: Effect[]): CasterSource[] {
  const sources: CasterSource[] = [];
  for (const cl of classLevels) {
    const cls = registry.getOf('class', cl.classId);
    if (cls?.spellcasting) {
      sources.push({ classId: cl.classId, ability: cls.spellcasting.ability, progression: cls.spellcasting.progression, classLevel: cl.level });
    }
  }
  for (const effect of effects) {
    if (effect.kind !== 'spellcasting' || sources.some((s) => s.classId === effect.classId)) continue;
    const classLevel = classLevels.find((cl) => cl.classId === effect.classId)?.level ?? 0;
    if (classLevel > 0) sources.push({ classId: effect.classId, ability: effect.ability, progression: effect.progression, classLevel });
  }
  return sources;
}

/**
 * Caster level for the Multiclass Spellcaster table. One slot-granting class: that class's own progression
 * (half rounds up; third rounds up, PHB). Several: full levels + half levels rounded up (SRD) + third levels
 * rounded down (PHB). Pact Magic never counts.
 */
export function casterLevel(sources: CasterSource[]): number {
  const slotted = sources.filter((s) => s.progression !== 'pact');
  if (slotted.length === 1) {
    const { progression, classLevel } = slotted[0];
    if (progression === 'full') return classLevel;
    return progression === 'half' ? Math.ceil(classLevel / 2) : Math.ceil(classLevel / 3);
  }
  return slotted.reduce((total, s) => {
    if (s.progression === 'full') return total + s.classLevel;
    return total + (s.progression === 'half' ? Math.ceil(s.classLevel / 2) : Math.floor(s.classLevel / 3));
  }, 0);
}

export type SpellStatsFn = (ability: Ability) => { attack: number; dc: number };

/** Spell attack bonus and save DC for a spellcasting ability: PB + modifier, and 8 + PB + modifier. */
export function makeSpellStats(abilities: Record<Ability, AbilityResult>, pb: number, bonus: BonusFn, d20Penalty: number): SpellStatsFn {
  return (ability) => {
    const mod = abilities[ability].mod;
    return { attack: pb + mod + bonus('spellAttack') - d20Penalty, dc: 8 + pb + mod + bonus('spellDC') };
  };
}

/** The Cantrips column plus `extraCantrips` effects for that class; a class without the column stays without a maximum. */
function withExtraCantrips(max: number | undefined, classId: string, effects: Effect[]): number | undefined {
  if (max === undefined) return undefined;
  return effects.reduce((total, e) => (e.kind === 'extraCantrips' && e.classId === classId ? total + e.count : total), max);
}

export function computeSpellcasting(
  character: Character,
  registry: ContentRegistry,
  sources: CasterSource[],
  stats: SpellStatsFn,
  effects: Effect[] = [],
): SpellcastingResult {
  const classes: CasterStats[] = sources.map((source) => {
    const cls = registry.getOf('class', source.classId);
    const row = cls?.levels[source.classLevel - 1];
    const column = (key: string) => (row?.columns[key] !== undefined ? parseColumnNumber(row.columns[key]) : undefined);
    return {
      classId: source.classId,
      name: cls?.name ?? source.classId,
      ability: source.ability,
      progression: source.progression,
      ...stats(source.ability),
      preparedMax: column('prepared-spells'),
      cantripsMax: withExtraCantrips(column('cantrips'), source.classId, effects),
    };
  });
  const slots = slotsForCasterLevel(casterLevel(sources)).map((max, index) => ({
    level: index + 1,
    max,
    used: Math.min(max, Math.max(0, character.state.slotsUsed[String(index + 1)] ?? 0)),
  }));
  const warlock = sources.find((s) => s.progression === 'pact');
  const pactRow = warlock ? registry.getOf('class', warlock.classId)?.pactSlotsByLevel?.[warlock.classLevel - 1] : undefined;
  const pact = pactRow ? { ...pactRow, used: Math.min(pactRow.slots, Math.max(0, character.state.pactSlotsUsed)) } : undefined;
  return { classes, slots, pact };
}

/** Damage cantrips the character knows, scaled at character levels 5, 11 and 17. */
export function computeCantripAttacks(
  character: Character,
  registry: ContentRegistry,
  spellcasting: SpellcastingResult,
  totalLevel: number,
  warnings: Warning[],
  stats: SpellStatsFn,
): AttackResult[] {
  const attacks: AttackResult[] = [];
  for (const known of character.choices.spells) {
    const spell = registry.getOf('spell', known.spellId);
    if (!spell) {
      unknownContent(warnings, known.spellId);
      continue;
    }
    if (spell.level !== 0 || !spell.cantrip) continue;
    // A spell from a feat (Magic Initiate) has its own ability; a class spell uses that class's caster stats and never
    // borrows another class's.
    const own = known.ability ? stats(known.ability) : spellcasting.classes.find((c) => c.classId === known.classId);
    if (!own) warnOnce(warnings, { code: 'cantrip-without-caster', detail: spell.id });
    const tier = spell.cantrip.scales ? 1 + [5, 11, 17].filter((l) => totalLevel >= l).length : 1;
    const dice = /^(\d+)d(\d+)$/.exec(spell.cantrip.damageDice);
    attacks.push({
      id: `${spell.id}@${known.classId}`,
      kind: 'cantrip',
      name: spell.name,
      toHit: spell.cantrip.attackType === 'attack' ? own?.attack : undefined,
      saveDC: spell.cantrip.attackType === 'save' ? own?.dc : undefined,
      saveAbility: spell.cantrip.saveAbility,
      damage: dice ? `${Number(dice[1]) * tier}d${dice[2]}` : spell.cantrip.damageDice,
      damageType: spell.cantrip.damageType,
      properties: [],
      proficient: true,
    });
  }
  return attacks;
}
