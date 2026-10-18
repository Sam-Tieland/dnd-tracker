import { ABILITIES, type Ability } from '../content/constants';
import type { ContentRegistry } from '../content/registry';
import type { Character } from '../model/character';
import { computeAbilities } from './abilities';
import { collectBonusParts, equippedArmor, makeBonus } from './bonuses';
import { computeInitiative, computeSaves, computeSkills } from './checks';
import { computeArmorClass, computeHitDice, computeHpMax, computeSpeed, computeUnarmedStrike, computeWeaponAttacks } from './combat';
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
  const bonusParts = collectBonusParts(features, character.overrides, ctx, equipment);
  const bonus = makeBonus(bonusParts);
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
  const spellcasting = computeSpellcasting(character, registry, sources, stats, effects);
  const monk = classLevels.find((cl) => cl.classId === 'srd:class:monk');
  const martialArtsDie =
    monk && !equipment.armor && !equipment.shield ? registry.getOf('class', monk.classId)?.levels[monk.level - 1]?.columns['martial-arts'] : undefined;
  const attacks = [
    ...computeWeaponAttacks(character, registry, abilities, prof, pb, bonus, d20Penalty),
    computeUnarmedStrike(abilities, pb, bonus, d20Penalty, martialArtsDie),
    ...computeCantripAttacks(character, registry, spellcasting, totalLevel, warnings, stats, bonus),
  ];
  multiclassWarnings(classLevels, registry, abilities, warnings);

  return {
    totalLevel,
    proficiencyBonus: pb,
    classLevels: classLevels.map((cl) => ({ ...cl, columns: registry.getOf('class', cl.classId)?.levels[cl.level - 1]?.columns ?? {} })),
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
    initiativeRefills: features.flatMap((f) =>
      f.effects.flatMap((e) => (e.kind === 'initiativeRefill' ? [{ key: e.key, upTo: e.upTo, costKey: e.costKey, source: f.name }] : [])),
    ),
    bonusParts,
    warnings,
  };
}
