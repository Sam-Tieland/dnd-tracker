import type { Character } from '../model/character';
import type { DerivedSheet } from './types';

const withState = (character: Character, patch: Partial<Character['state']>): Character => ({
  ...character,
  state: { ...character.state, ...patch },
});
const whole = (value: number) => Math.max(0, Math.floor(value));
const NO_DEATH_SAVES = { successes: 0, failures: 0 };

/** Damage hits temporary hit points first; hit points never drop below 0. */
export function applyDamage(character: Character, amount: number): Character {
  const damage = whole(amount);
  const fromTemp = Math.min(character.state.hpTemp, damage);
  return withState(character, {
    hpTemp: character.state.hpTemp - fromTemp,
    hpCurrent: Math.max(0, character.state.hpCurrent - (damage - fromTemp)),
  });
}

/** Healing up to the maximum; being above 0 hit points resets death saves. */
export function applyHealing(character: Character, amount: number, sheet: DerivedSheet): Character {
  const hpCurrent = Math.min(sheet.hp.max, Math.max(0, character.state.hpCurrent) + whole(amount));
  return withState(character, { hpCurrent, deathSaves: hpCurrent > 0 ? NO_DEATH_SAVES : character.state.deathSaves });
}

/** Temporary hit points don't stack: the new value replaces the old one. */
export function setTempHp(character: Character, value: number): Character {
  return withState(character, { hpTemp: whole(value) });
}

export function setDeathSaves(character: Character, successes: number, failures: number): Character {
  const clamp = (n: number) => Math.min(3, whole(n));
  return withState(character, { deathSaves: { successes: clamp(successes), failures: clamp(failures) } });
}

export function setSlotsUsed(character: Character, slotLevel: number, used: number, sheet: DerivedSheet): Character {
  const max = sheet.spellcasting.slots.find((s) => s.level === slotLevel)?.max ?? 0;
  return withState(character, { slotsUsed: { ...character.state.slotsUsed, [String(slotLevel)]: Math.min(max, whole(used)) } });
}

export function setPactSlotsUsed(character: Character, used: number, sheet: DerivedSheet): Character {
  return withState(character, { pactSlotsUsed: Math.min(sheet.spellcasting.pact?.slots ?? 0, whole(used)) });
}

export function setResourceUsed(character: Character, key: string, used: number, sheet: DerivedSheet): Character {
  const resource = sheet.resources.find((r) => r.key === key);
  if (!resource) return character;
  return withState(character, { resourcesUsed: { ...character.state.resourcesUsed, [key]: Math.min(resource.max, whole(used)) } });
}

export interface ShortRestOptions {
  /** Hit dice to spend per die size, e.g. { d10: 2 }. */
  hitDice: Record<string, number>;
  /** Hit points regained from the spent dice, already rolled by the caller (die + CON, minimum 1 per die). */
  hpRegained: number;
}

export function shortRest(character: Character, sheet: DerivedSheet, options: ShortRestOptions): Character {
  const hitDiceSpent: Record<string, number> = {};
  for (const hd of sheet.hitDice) {
    const key = `d${hd.die}`;
    hitDiceSpent[key] = hd.spent + Math.min(whole(options.hitDice[key] ?? 0), hd.total - hd.spent);
  }
  const resourcesUsed: Record<string, number> = {};
  for (const resource of sheet.resources) {
    resourcesUsed[resource.key] = resource.recharge === 'short' ? 0 : Math.max(0, resource.used - resource.shortRestRegain);
  }
  const hpCurrent = Math.min(sheet.hp.max, sheet.hp.current + whole(options.hpRegained));
  return withState(character, {
    hitDiceSpent,
    resourcesUsed,
    pactSlotsUsed: 0,
    hpCurrent,
    deathSaves: hpCurrent > 0 ? NO_DEATH_SAVES : character.state.deathSaves,
  });
}

export function longRest(character: Character, sheet: DerivedSheet): Character {
  return withState(character, {
    hpCurrent: sheet.hp.max,
    hpTemp: 0,
    hitDiceSpent: {},
    slotsUsed: {},
    pactSlotsUsed: 0,
    resourcesUsed: {},
    deathSaves: NO_DEATH_SAVES,
    exhaustion: Math.max(0, character.state.exhaustion - 1),
    heroicInspiration: sheet.flags.includes('heroic-inspiration-on-long-rest') || character.state.heroicInspiration,
  });
}
