import { ABILITIES, SKILL_IDS, SKILLS, type Ability, type SkillId } from '../content/constants';
import type { BonusFn } from './bonuses';
import type { Proficiencies } from './proficiencies';
import type { AbilityResult, CheckResult, SkillResult } from './types';

type Abilities = Record<Ability, AbilityResult>;

export function computeSaves(abilities: Abilities, prof: Proficiencies, pb: number, bonus: BonusFn, d20Penalty: number): Record<Ability, CheckResult> {
  const result = {} as Record<Ability, CheckResult>;
  for (const ability of ABILITIES) {
    const proficient = prof.saves.has(ability);
    result[ability] = { proficient, bonus: abilities[ability].mod + (proficient ? pb : 0) + bonus(`save:${ability}`) - d20Penalty };
  }
  return result;
}

/** Expertise doubles the bonus; Jack of All Trades (halfProficiency) adds half PB to skills without proficiency. */
export function computeSkills(abilities: Abilities, prof: Proficiencies, pb: number, bonus: BonusFn, d20Penalty: number) {
  const skills = {} as Record<SkillId, SkillResult>;
  let perception = 0;
  for (const id of SKILL_IDS) {
    const ability = SKILLS[id];
    const expertise = prof.expertise.has(id);
    const proficient = expertise || prof.skills.has(id);
    const profPart = expertise ? 2 * pb : proficient ? pb : prof.halfProficiency ? Math.floor(pb / 2) : 0;
    const raw = abilities[ability].mod + profPart + bonus(`skill:${id}`);
    if (id === 'perception') perception = raw;
    skills[id] = { ability, proficient, expertise, bonus: raw - d20Penalty };
  }
  return { skills, passivePerception: 10 + perception + bonus('passivePerception') };
}

export function computeInitiative(abilities: Abilities, bonus: BonusFn, d20Penalty: number): number {
  return abilities.dex.mod + bonus('initiative') - d20Penalty;
}
