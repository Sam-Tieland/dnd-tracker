import { ABILITIES, type Ability } from '../content/constants';
import type { ContentRegistry } from '../content/registry';
import type { Character } from '../model/character';
import { computeAbilities } from './abilities';
import { equippedArmor, makeBonus } from './bonuses';
import { computeInitiative, computeSaves, computeSkills } from './checks';
import { computeArmorClass, computeHitDice, computeHpMax, computeSpeed, computeWeaponAttacks } from './combat';
import { collectFeatures } from './features';
import { parseColumnNumber, type FormulaContext } from './formula';
import { getClassLevels, proficiencyBonus } from './levels';
import { multiclassWarnings } from './multiclass';
import { computeProficiencies } from './proficiencies';
import { computeResources } from './resources';
import { computeCantripAttacks, computeSpellcasting, makeSpellStats, spellcastingSources } from './spellcasting';
import type { DerivedSheet, Warning } from './types';
import { unknownContent, warnOnce } from './warnings';

/** Everything on the sheet that follows from the character's choices and state. Never throws on missing content. */
export function deriveSheet(character: Character, registry: ContentRegistry): DerivedSheet {
  const warnings: Warning[] = [];
  const classLevels = getClassLevels(character, registry, warnings);
  const totalLevel = classLevels.reduce((sum, cl) => sum + cl.level, 0);
  const pb = proficiencyBonus(totalLevel);
  const features = collectFeatures(character, registry, classLevels, warnings);
  const effects = features.flatMap((f) => f.effects);
  const abilities = computeAbilities(character, effects, warnings);

  const levelOf = (classId: string) => classLevels.find((cl) => cl.classId === classId)?.level ?? 0;
  const ctx: FormulaContext = {
    pb,
    mods: Object.fromEntries(ABILITIES.map((a) => [a, abilities[a].mod])) as Record<Ability, number>,
    totalLevel,
    classLevel: levelOf,
    column: (classId, key) => {
      const classLevel = levelOf(classId);
      const cls = registry.getOf('class', classId);
      return classLevel > 0 && cls ? parseColumnNumber(cls.levels[classLevel - 1]?.columns[key]) : 0;
    },
  };
  const equipment = equippedArmor(character, registry);
  const bonus = makeBonus(effects, character.overrides, ctx, equipment);
  const prof = computeProficiencies(character, registry, classLevels, effects);
  // SRD Armor Training: without training, Disadvantage on Strength and Dexterity D20 Tests and no spellcasting.
  if (equipment.armor && !prof.armor.has(equipment.armor.category)) {
    warnOnce(warnings, { code: 'armor-untrained', detail: equipment.armor.id });
  }
  const d20Penalty = 2 * character.state.exhaustion;
  const { skills, passivePerception } = computeSkills(abilities, prof, pb, bonus, d20Penalty);
  const hpMax = computeHpMax(character, registry, abilities.con.mod, bonus);
  for (const entry of character.inventory) {
    if (entry.itemId && !registry.get(entry.itemId)) unknownContent(warnings, entry.itemId);
  }
  const sources = spellcastingSources(classLevels, registry, effects);
  const stats = makeSpellStats(abilities, pb, bonus, d20Penalty);
  const spellcasting = computeSpellcasting(character, registry, sources, stats);
  const attacks = [
    ...computeWeaponAttacks(character, registry, abilities, prof, pb, bonus, d20Penalty),
    ...computeCantripAttacks(character, registry, spellcasting, totalLevel, warnings, stats),
  ];
  multiclassWarnings(classLevels, registry, abilities, warnings);

  return {
    totalLevel,
    proficiencyBonus: pb,
    classLevels,
    abilities,
    saves: computeSaves(abilities, prof, pb, bonus, d20Penalty),
    skills,
    passivePerception,
    initiative: computeInitiative(abilities, bonus, d20Penalty),
    speed: computeSpeed(character, registry, abilities, equipment, bonus),
    d20Penalty,
    hp: { current: Math.min(Math.max(0, character.state.hpCurrent), hpMax), max: hpMax, temp: character.state.hpTemp },
    hitDice: computeHitDice(classLevels, character.state.hitDiceSpent),
    ac: computeArmorClass(equipment, abilities, effects, prof.armor, bonus),
    attacks,
    spellcasting,
    resources: computeResources(effects, ctx, character.state.resourcesUsed),
    features,
    armorTraining: [...prof.armor],
    weaponProficiencies: [...prof.weapons],
    flags: effects.flatMap((e) => (e.kind === 'flag' ? [e.flag] : [])),
    warnings,
  };
}
