import type { Character } from '../model/character';
import type { DerivedSheet, LifeState } from './types';

const withState = (character: Character, patch: Partial<Character['state']>): Character => ({
  ...character,
  state: { ...character.state, ...patch },
});
/** Whole, non-negative amounts; NaN and Infinity count as 0 so they never reach the character state. */
const whole = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0);
const noDeathSaves = () => ({ successes: 0, failures: 0 });
const withoutConcentration = (character: Character): Character => {
  if (character.state.concentration === undefined) return character;
  const { concentration: _ended, ...state } = character.state;
  return { ...character, state };
};

/** SRD Rules Glossary, Concentration: these conditions are or include Incapacitated, which ends Concentration. */
export const INCAPACITATING_CONDITIONS: readonly string[] = ['incapacitated', 'paralyzed', 'petrified', 'stunned', 'unconscious'];

/** SRD Concentration: the Constitution save after damage has DC 10 or half the damage (round down), at most 30. */
export function concentrationDC(damage: number): number {
  return Math.min(30, Math.max(10, Math.floor(whole(damage) / 2)));
}

/** Starts Concentration on a spell (ending the one before, SRD "Another Concentration Effect"), or ends it. */
export function setConcentration(character: Character, spellId: string | undefined): Character {
  return spellId === undefined ? withoutConcentration(character) : withState(character, { concentration: spellId });
}

/**
 * SRD "Dropping to 0 Hit Points": three failures, or Exhaustion level 6, is death. Three successes is Stable; the app
 * keeps that as successes = 3 until the character regains hit points. Without levels there are no hit points yet.
 */
export function lifeState(character: Character, sheet: DerivedSheet): LifeState {
  const { deathSaves, exhaustion } = character.state;
  if (deathSaves.failures >= 3 || exhaustion >= 6) return 'dead';
  if (sheet.hp.current > 0 || sheet.hp.max === 0) return 'alive';
  return deathSaves.successes >= 3 ? 'stable' : 'dying';
}

export interface DamageOptions {
  /** The damage comes from a Critical Hit: two death save failures at 0 hit points. */
  critical?: boolean;
}

/**
 * Damage hits temporary hit points first; hit points never drop below 0. It starts from the hit points the sheet
 * shows (stored value capped at the maximum), so stale hit points above the maximum don't hide the damage.
 * SRD "Damage at 0 Hit Points": one death save failure (two from a critical hit), and death when the damage equals or
 * exceeds the hit point maximum; a Stable character starts over. SRD "Massive Damage": dropping to 0 with a remainder
 * that equals or exceeds the maximum is death too.
 */
export function applyDamage(character: Character, amount: number, sheet: DerivedSheet, options: DamageOptions = {}): Character {
  const damage = whole(amount);
  const fromTemp = Math.min(character.state.hpTemp, damage);
  const toHp = damage - fromTemp;
  const shown = Math.min(Math.max(0, character.state.hpCurrent), sheet.hp.max);
  const max = sheet.hp.max;
  let { deathSaves } = character.state;
  if (toHp > 0 && max > 0) {
    if (shown === 0) {
      const failures = toHp >= max ? 3 : deathSaves.failures + (options.critical ? 2 : 1);
      deathSaves = { successes: deathSaves.successes >= 3 ? 0 : deathSaves.successes, failures: Math.min(3, failures) };
    } else if (toHp - shown >= max) {
      deathSaves = { successes: 0, failures: 3 };
    }
  }
  const hpCurrent = Math.max(0, shown - toHp);
  const next = withState(character, { hpTemp: character.state.hpTemp - fromTemp, hpCurrent, deathSaves });
  // At 0 hit points the character is Unconscious, so Incapacitated: Concentration ends.
  return hpCurrent === 0 && max > 0 ? withoutConcentration(next) : next;
}

/** Healing up to the maximum; being above 0 hit points resets death saves. */
export function applyHealing(character: Character, amount: number, sheet: DerivedSheet): Character {
  const hpCurrent = Math.min(sheet.hp.max, Math.max(0, character.state.hpCurrent) + whole(amount));
  return withState(character, { hpCurrent, deathSaves: hpCurrent > 0 ? noDeathSaves() : character.state.deathSaves });
}

/** Temporary hit points don't stack: the new value replaces the old one. */
export function setTempHp(character: Character, value: number): Character {
  return withState(character, { hpTemp: whole(value) });
}

export function setDeathSaves(character: Character, successes: number, failures: number): Character {
  const clamp = (n: number) => Math.min(3, whole(n));
  return withState(character, { deathSaves: { successes: clamp(successes), failures: clamp(failures) } });
}

/**
 * SRD "Death Saving Throws": a 1 counts as two failures, a 20 regains 1 Hit Point, otherwise 10 or higher succeeds.
 * Exhaustion lowers the roll like any D20 Test. The third success makes the character Stable. Only a dying character rolls.
 */
export function recordDeathSave(character: Character, natural: number, sheet: DerivedSheet): Character {
  if (lifeState(character, sheet) !== 'dying') return character;
  if (natural >= 20) return applyHealing(character, 1, sheet);
  const { successes, failures } = character.state.deathSaves;
  if (natural > 1 && natural - sheet.d20Penalty >= 10) {
    const next = successes + 1;
    return withState(character, { deathSaves: next >= 3 ? { successes: 3, failures: 0 } : { successes: next, failures } });
  }
  return withState(character, { deathSaves: { successes, failures: Math.min(3, failures + (natural <= 1 ? 2 : 1)) } });
}

export function setConditions(character: Character, conditions: readonly string[]): Character {
  const next = withState(character, { conditions: [...new Set(conditions)] });
  return conditions.some((c) => INCAPACITATING_CONDITIONS.includes(c)) ? withoutConcentration(next) : next;
}

/** Exhaustion levels 0–6 (SRD Rules Glossary). */
export function setExhaustion(character: Character, level: number): Character {
  return withState(character, { exhaustion: Math.min(6, whole(level)) });
}

export function setHeroicInspiration(character: Character, on: boolean): Character {
  return withState(character, { heroicInspiration: on });
}

/** A slot level the sheet doesn't have leaves the character unchanged, so no invalid key is ever stored. */
export function setSlotsUsed(character: Character, slotLevel: number, used: number, sheet: DerivedSheet): Character {
  const slot = sheet.spellcasting.slots.find((s) => s.level === slotLevel);
  if (!slot) return character;
  return withState(character, { slotsUsed: { ...character.state.slotsUsed, [String(slotLevel)]: Math.min(slot.max, whole(used)) } });
}

export function setPactSlotsUsed(character: Character, used: number, sheet: DerivedSheet): Character {
  return withState(character, { pactSlotsUsed: Math.min(sheet.spellcasting.pact?.slots ?? 0, whole(used)) });
}

export function setResourceUsed(character: Character, key: string, used: number, sheet: DerivedSheet): Character {
  const resource = sheet.resources.find((r) => r.key === key);
  if (!resource) return character;
  return withState(character, { resourcesUsed: { ...character.state.resourcesUsed, [key]: Math.min(resource.max, whole(used)) } });
}

/** Uses spent after a refill: all back, or back up to `upTo` left. Never spends uses the character still has. */
function refilledUsed(max: number, used: number, upTo: number | undefined): number {
  const left = max - used;
  const goal = upTo === undefined ? max : Math.min(upTo, max);
  return left >= goal ? used : max - goal;
}

/**
 * Rolling Initiative: the refills that need no choice (Superior Inspiration, Perfect Focus, Evergreen Wild Shape).
 * Returns the character unchanged when nothing refills, plus the names of what did.
 */
export function applyInitiativeRefills(character: Character, sheet: DerivedSheet): { character: Character; refilled: string[] } {
  const resourcesUsed = { ...character.state.resourcesUsed };
  const refilled: string[] = [];
  for (const refill of sheet.initiativeRefills) {
    if (refill.costKey !== undefined) continue;
    const resource = sheet.resources.find((r) => r.key === refill.key);
    if (!resource) continue;
    const used = refilledUsed(resource.max, resourcesUsed[resource.key] ?? resource.used, refill.upTo);
    if (used === (resourcesUsed[resource.key] ?? resource.used)) continue;
    resourcesUsed[resource.key] = used;
    refilled.push(`${resource.name} ${resource.max - used}/${resource.max}`);
  }
  return refilled.length === 0 ? { character, refilled } : { character: withState(character, { resourcesUsed }), refilled };
}

/** Refills at Initiative that are a choice and still possible: the cost has a use left and the resource is not full. */
export function initiativeChoices(sheet: DerivedSheet): Array<{ costKey: string; name: string }> {
  return sheet.initiativeRefills.flatMap((refill) => {
    const cost = sheet.resources.find((r) => r.key === refill.costKey);
    const resource = sheet.resources.find((r) => r.key === refill.key);
    if (!cost || !resource || cost.used >= cost.max) return [];
    return refilledUsed(resource.max, resource.used, refill.upTo) === resource.used ? [] : [{ costKey: cost.key, name: cost.name }];
  });
}

/** Takes a refill that costs a use (Persistent Rage: all Rage back; Uncanny Metabolism: all Focus Points back). */
export function takeInitiativeRefill(character: Character, sheet: DerivedSheet, costKey: string): Character {
  const refill = sheet.initiativeRefills.find((r) => r.costKey === costKey);
  const cost = sheet.resources.find((r) => r.key === costKey);
  const resource = sheet.resources.find((r) => r.key === refill?.key);
  if (!refill || !cost || !resource || cost.used >= cost.max) return character;
  return withState(character, {
    resourcesUsed: {
      ...character.state.resourcesUsed,
      [resource.key]: refilledUsed(resource.max, resource.used, refill.upTo),
      [cost.key]: cost.used + 1,
    },
  });
}

/** SRD "Short Rest" and "Long Rest": you need at least 1 Hit Point to start one. */
export function canRest(sheet: DerivedSheet): boolean {
  return sheet.hp.current >= 1;
}

export interface HitDieRoll {
  /** Die size, e.g. 10 for a d10. */
  die: number;
  /** The number rolled on that die. */
  roll: number;
}

export interface ShortRestOptions {
  /** One entry per Hit Point Die spent, in the order rolled. Rolls for dice that are not left are ignored. */
  rolls: HitDieRoll[];
}

/**
 * SRD "Short Rest": each spent Hit Point Die heals its roll + Constitution modifier (minimum 1), only for dice that
 * were left. Short-rest resources and Pact Magic slots recharge. Needs at least 1 Hit Point.
 */
export function shortRest(character: Character, sheet: DerivedSheet, options: ShortRestOptions): Character {
  if (!canRest(sheet)) return character;
  const left = new Map(sheet.hitDice.map((hd) => [hd.die, hd.total - hd.spent]));
  const hitDiceSpent: Record<string, number> = Object.fromEntries(sheet.hitDice.map((hd) => [`d${hd.die}`, hd.spent]));
  let regained = 0;
  for (const { die, roll } of options.rolls) {
    const remaining = left.get(die) ?? 0;
    if (remaining <= 0 || !Number.isFinite(roll)) continue;
    left.set(die, remaining - 1);
    hitDiceSpent[`d${die}`] += 1;
    regained += Math.max(1, Math.min(die, Math.max(1, Math.floor(roll))) + sheet.abilities.con.mod);
  }
  const resourcesUsed: Record<string, number> = {};
  for (const resource of sheet.resources) {
    resourcesUsed[resource.key] = resource.recharge === 'short' ? 0 : Math.max(0, resource.used - resource.shortRestRegain);
  }
  return withState(character, {
    hitDiceSpent,
    resourcesUsed,
    pactSlotsUsed: 0,
    hpCurrent: Math.min(sheet.hp.max, sheet.hp.current + regained),
    deathSaves: noDeathSaves(),
    // Ranger Tireless: a Short Rest also lowers Exhaustion by 1.
    exhaustion: sheet.flags.includes('exhaustion-down-on-short-rest') ? Math.max(0, character.state.exhaustion - 1) : character.state.exhaustion,
  });
}

export function longRest(character: Character, sheet: DerivedSheet): Character {
  if (!canRest(sheet)) return character;
  return withState(character, {
    hpCurrent: sheet.hp.max,
    hpTemp: 0,
    hitDiceSpent: {},
    slotsUsed: {},
    pactSlotsUsed: 0,
    // A resource the player restores by hand (Greater Divine Intervention) stays spent.
    resourcesUsed: Object.fromEntries(sheet.resources.filter((r) => r.recharge === 'manual' && r.used > 0).map((r) => [r.key, r.used])),
    deathSaves: noDeathSaves(),
    exhaustion: Math.max(0, character.state.exhaustion - 1),
    heroicInspiration: sheet.flags.includes('heroic-inspiration-on-long-rest') || character.state.heroicInspiration,
  });
}

/**
 * After the choices changed (the form was saved): a character that had no levels starts at full hit points; otherwise
 * the current hit points rise by as much as the maximum rose, and never exceed the new maximum. SRD "Death Saving
 * Throws": both counts reset to zero when the character regains any Hit Points, so death saves reset above 0 and are
 * kept at 0.
 */
export function syncHitPoints(character: Character, before: DerivedSheet, after: DerivedSheet): Character {
  const hpCurrent =
    before.totalLevel === 0 ? after.hp.max : Math.min(after.hp.max, before.hp.current + Math.max(0, after.hp.max - before.hp.max));
  return withState(character, { hpCurrent, deathSaves: hpCurrent > 0 ? noDeathSaves() : character.state.deathSaves });
}
