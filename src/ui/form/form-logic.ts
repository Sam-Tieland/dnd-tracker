import { ABILITIES, type Ability } from '../../content/constants';
import type { ContentRegistry } from '../../content/registry';
import { STANDARD_ARRAY } from '../../content/srd/creation';
import { createCharacter, type Character, type LevelChoice } from '../../model/character';
import { syncHitPoints } from '../../rules/actions';
import { deriveSheet } from '../../rules/derive';

export const ASI_FEAT_ID = 'srd:feat:ability-score-improvement';
export const MAX_LEVEL = 20;

type Choices = Character['choices'];
export type AbilityMethod = Choices['abilityMethod'];
export type BonusMode = 'two' | 'three';

const withChoices = (character: Character, patch: Partial<Choices>): Character => ({ ...character, choices: { ...character.choices, ...patch } });
const scores = (pick: (index: number) => number) => Object.fromEntries(ABILITIES.map((a, i) => [a, pick(i)])) as Record<Ability, number>;
const mapLevel = (character: Character, index: number, update: (level: LevelChoice) => LevelChoice): Character =>
  withChoices(character, { levels: character.choices.levels.map((level, i) => (i === index ? update(level) : level)) });

/** Standard array assigns 15, 14, 13, 12, 10, 8 from STR to CHA; point buy starts at all 8s; rolled and manual keep the scores. */
export function setAbilityMethod(character: Character, method: AbilityMethod): Character {
  if (method === 'standard') return withChoices(character, { abilityMethod: method, baseAbilities: scores((i) => STANDARD_ARRAY[i]) });
  if (method === 'pointbuy') return withChoices(character, { abilityMethod: method, baseAbilities: scores(() => 8) });
  return withChoices(character, { abilityMethod: method });
}

/** Standard array: the value moves to this ability and this ability's old value goes to the one that had it. */
export function assignStandard(character: Character, ability: Ability, value: number): Character {
  const next = { ...character.choices.baseAbilities };
  const holder = ABILITIES.find((a) => next[a] === value);
  if (holder) next[holder] = next[ability];
  next[ability] = value;
  return withChoices(character, { baseAbilities: next });
}

/** A typed score becomes a whole number from 1 to 30 (the schema's range); a non-number changes nothing. */
export function setBaseAbility(character: Character, ability: Ability, value: number): Character {
  if (!Number.isFinite(value)) return character;
  return withChoices(character, { baseAbilities: { ...character.choices.baseAbilities, [ability]: Math.min(30, Math.max(1, Math.round(value))) } });
}

export function setBackground(character: Character, backgroundId: string | null): Character {
  return withChoices(character, { backgroundId, backgroundAbilityBonuses: {} });
}

/** SRD backgrounds: +2 to one and +1 to another of the background's three abilities, or +1 to all three. */
export function setBackgroundBonuses(
  character: Character,
  options: readonly Ability[],
  mode: BonusMode,
  plusTwo?: Ability,
  plusOne?: Ability,
): Character {
  if (mode === 'three') return withChoices(character, { backgroundAbilityBonuses: Object.fromEntries(options.map((a) => [a, 1])) });
  const bonuses: Partial<Record<Ability, number>> = {};
  if (plusTwo && options.includes(plusTwo)) bonuses[plusTwo] = 2;
  if (plusOne && plusOne !== plusTwo && options.includes(plusOne)) bonuses[plusOne] = 1;
  return withChoices(character, { backgroundAbilityBonuses: bonuses });
}

export function bonusMode(bonuses: Partial<Record<Ability, number>>): BonusMode {
  return Object.values(bonuses).filter((v) => v === 1).length === 3 ? 'three' : 'two';
}

export function addLevel(character: Character, classId: string): Character {
  if (character.choices.levels.length >= MAX_LEVEL) return character;
  return withChoices(character, { levels: [...character.choices.levels, { classId, hp: 'average', featureChoices: {} }] });
}

/** Spec §5: undoing a level removes the last LevelChoice. */
export function removeLastLevel(character: Character): Character {
  return withChoices(character, { levels: character.choices.levels.slice(0, -1) });
}

/** Average, or a rolled whole number of at least 1; a non-number changes nothing. */
export function setLevelHp(character: Character, index: number, hp: 'average' | number): Character {
  if (hp !== 'average' && !Number.isFinite(hp)) return character;
  return mapLevel(character, index, (level) => ({ ...level, hp: hp === 'average' ? 'average' : Math.max(1, Math.round(hp)) }));
}

/** A feat on this level; any other feat than Ability Score Improvement drops the ASI scores. */
export function setLevelFeat(character: Character, index: number, featId: string | undefined): Character {
  return mapLevel(character, index, ({ featId: _old, asi, ...rest }) => {
    if (!featId) return rest;
    return featId === ASI_FEAT_ID && asi ? { ...rest, featId, asi } : { ...rest, featId };
  });
}

/** SRD Ability Score Improvement feat: +2 to one score, or +1 to two; the same ability twice means +2. */
export function setLevelAsi(character: Character, index: number, first: Ability, second: Ability): Character {
  return mapLevel(character, index, (level) => ({ ...level, featId: ASI_FEAT_ID, asi: first === second ? { [first]: 2 } : { [first]: 1, [second]: 1 } }));
}

/** The class level at which the subclass is chosen, from the SRD class table (3 for every SRD class). */
export function subclassLevel(registry: ContentRegistry, classId: string): number | undefined {
  return registry.getOf('class', classId)?.subclassLevels[0];
}

/** The subclass goes on the level that reaches the class's subclass level, and off its other levels. */
export function setSubclass(character: Character, registry: ContentRegistry, classId: string, subclassId: string | undefined): Character {
  const at = subclassLevel(registry, classId) ?? 1;
  let count = 0;
  let target = -1;
  character.choices.levels.forEach((level, i) => {
    if (level.classId !== classId) return;
    count += 1;
    if (count <= at) target = i;
  });
  return withChoices(character, {
    levels: character.choices.levels.map((level, i) => {
      if (level.classId !== classId) return level;
      const { subclassId: _old, ...rest } = level;
      return i === target && subclassId ? { ...rest, subclassId } : rest;
    }),
  });
}

export function setSkill(character: Character, skill: string, on: boolean): Character {
  const skills = character.choices.skillProficiencies.filter((s) => s !== skill);
  return withChoices(character, {
    skillProficiencies: on ? [...skills, skill] : skills,
    expertise: on ? character.choices.expertise : character.choices.expertise.filter((s) => s !== skill),
  });
}

export function setExpertise(character: Character, skill: string, on: boolean): Character {
  const expertise = character.choices.expertise.filter((s) => s !== skill);
  return withChoices(character, { expertise: on ? [...expertise, skill] : expertise });
}

/** "Common, Dwarvish , ,Elvish" -> ["Common", "Dwarvish", "Elvish"], each entry once. */
export function parseList(text: string): string[] {
  return [...new Set(text.split(',').map((s) => s.trim()).filter(Boolean))];
}

/** Drops chosen options whose parent feature is no longer active, e.g. Divine Order after the Cleric level was removed. */
export function pruneOptions(character: Character, registry: ContentRegistry, activeFeatureIds: ReadonlySet<string>): Character {
  const featureOptions = character.choices.featureOptions.filter((id) => {
    const parentId = registry.getOf('feature', id)?.optionOf;
    return parentId === undefined || activeFeatureIds.has(parentId);
  });
  return withChoices(character, { featureOptions });
}

/**
 * What saving the form stores: options without an active parent dropped, hit points following the new maximum (full
 * for a character that had no levels), and updatedAt set.
 */
export function finishForm(original: Character | undefined, draft: Character, registry: ContentRegistry, now: string): Character {
  const pruned = pruneOptions(draft, registry, new Set(deriveSheet(draft, registry).features.map((f) => f.id)));
  const before = deriveSheet(original ?? createCharacter({ id: draft.id, now }), registry);
  const synced = syncHitPoints(pruned, before, deriveSheet(pruned, registry));
  return { ...synced, updatedAt: now };
}
