import { ABILITIES, type Ability } from '../content/constants';
import type { Effect } from '../content/schema';
import type { Character } from '../model/character';
import type { AbilityResult, Warning } from './types';
import { warnOnce } from './warnings';

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Base + background bonus + ASIs + numeric `ability:<ab>` bonuses and overrides, capped at 20
 * plus any `abilityMax:<ab>` bonuses. Non-numeric ability bonus formulas are ignored.
 */
export function computeAbilities(character: Character, effects: Effect[], warnings: Warning[]): Record<Ability, AbilityResult> {
  const { baseAbilities, backgroundAbilityBonuses, levels } = character.choices;
  const result = {} as Record<Ability, AbilityResult>;
  for (const ability of ABILITIES) {
    let raw = baseAbilities[ability] + (backgroundAbilityBonuses[ability] ?? 0);
    for (const choice of levels) raw += choice.asi?.[ability] ?? 0;
    let max = 20;
    const apply = (target: string, value: number) => {
      if (target === `ability:${ability}`) raw += value;
      if (target === `abilityMax:${ability}`) max += value;
    };
    for (const effect of effects) if (effect.kind === 'bonus' && typeof effect.value === 'number') apply(effect.target, effect.value);
    for (const override of character.overrides) apply(override.target, override.value);
    if (raw > max) warnOnce(warnings, { code: 'ability-over-max', detail: ability });
    const score = Math.min(raw, max);
    result[ability] = { score, mod: abilityModifier(score), max };
  }
  return result;
}
