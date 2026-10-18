import { SPEED_ZERO_CONDITIONS, type Ability } from '../content/constants';
import type { ContentRegistry } from '../content/registry';
import type { ArmorTraining, Effect, WeaponDef, WeaponProficiency } from '../content/schema';
import type { Character } from '../model/character';
import type { BonusFn, Equipment } from './bonuses';
import type { Proficiencies } from './proficiencies';
import type { AbilityResult, ArmorClassResult, AttackResult, ClassLevel, HitDiceResult } from './types';

type Abilities = Record<Ability, AbilityResult>;

export function computeHpMax(character: Character, registry: ContentRegistry, conMod: number, bonus: BonusFn): number {
  let total = 0;
  character.choices.levels.forEach((choice, index) => {
    const cls = registry.getOf('class', choice.classId);
    if (!cls) return;
    const gain = index === 0 ? cls.hitDie : choice.hp === 'average' ? cls.hitDie / 2 + 1 : choice.hp;
    total += gain + conMod;
  });
  return Math.max(0, total + bonus('hpMax'));
}

export function computeHitDice(classLevels: ClassLevel[], spent: Record<string, number>): HitDiceResult[] {
  const totals = new Map<number, number>();
  for (const cl of classLevels) totals.set(cl.hitDie, (totals.get(cl.hitDie) ?? 0) + cl.level);
  return [...totals.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([die, total]) => ({ die, total, spent: Math.min(total, Math.max(0, spent[`d${die}`] ?? 0)) }));
}

/** A shield only adds its AC with Shield training, but wielding one still blocks Unarmored Defense formulas. */
export function computeArmorClass(
  equipment: Equipment,
  abilities: Abilities,
  effects: Effect[],
  armorTraining: Set<ArmorTraining>,
  bonus: BonusFn,
): ArmorClassResult {
  const dex = abilities.dex.mod;
  let value: number;
  let source: string;
  if (equipment.armor) {
    const armor = equipment.armor;
    const dexPart = armor.category === 'heavy' ? 0 : armor.dexCap === null ? dex : Math.min(dex, armor.dexCap);
    value = armor.baseAC + dexPart;
    source = armor.name;
  } else {
    value = 10 + dex;
    source = 'Unarmored';
    for (const effect of effects) {
      if (effect.kind !== 'acFormula' || (equipment.shield && !effect.allowShield)) continue;
      const candidate = effect.base + effect.abilities.reduce((total, ability) => total + abilities[ability].mod, 0);
      if (candidate > value) {
        value = candidate;
        source = effect.name;
      }
    }
  }
  if (equipment.shield && armorTraining.has('shield')) value += equipment.shield.baseAC;
  return { value: value + bonus('ac'), source, armored: !!equipment.armor, shield: !!equipment.shield };
}

export function computeSpeed(character: Character, registry: ContentRegistry, abilities: Abilities, equipment: Equipment, bonus: BonusFn): number {
  // SRD Rules Glossary: Grappled, Paralyzed, Petrified, Restrained and Unconscious set Speed to 0.
  if (character.state.conditions.some((c) => (SPEED_ZERO_CONDITIONS as readonly string[]).includes(c))) return 0;
  const { speciesId } = character.choices;
  const species = speciesId ? registry.getOf('species', speciesId) : undefined;
  let speed = (species?.speed ?? 30) + bonus('speed');
  const strength = equipment.armor?.strength;
  if (strength && abilities.str.score < strength) speed -= 10;
  speed -= 5 * character.state.exhaustion;
  return Math.max(0, speed);
}

export function isWeaponProficient(weapon: WeaponDef, proficiencies: Set<WeaponProficiency>): boolean {
  if (proficiencies.has(weapon.category)) return true;
  if (weapon.category !== 'martial') return false;
  const has = (property: string) => weapon.properties.some((p) => p.startsWith(property));
  if (proficiencies.has('martial-light') && has('Light')) return true;
  return proficiencies.has('martial-finesse-or-light') && (has('Finesse') || has('Light'));
}

export function withModifier(dice: string, modifier: number): string {
  if (modifier === 0) return dice;
  return `${dice}${modifier > 0 ? '+' : '-'}${Math.abs(modifier)}`;
}

export const UNARMED_STRIKE_ID = 'unarmed-strike';

/**
 * SRD Rules Glossary "Unarmed Strike": everyone has it, Strength modifier + Proficiency Bonus to hit and 1 + Strength
 * modifier Bludgeoning damage. A Monk without armor or a Shield uses the Martial Arts die and the better of Strength
 * and Dexterity (SRD Monk, Martial Arts). Grapple and Shove use 8 + Strength modifier + PB, shown with the attack.
 */
export function computeUnarmedStrike(
  abilities: Abilities,
  pb: number,
  bonus: BonusFn,
  d20Penalty: number,
  martialArtsDie: string | undefined,
): AttackResult {
  const mod = martialArtsDie ? Math.max(abilities.str.mod, abilities.dex.mod) : abilities.str.mod;
  const extra = bonus('damage') + bonus(`damage:${UNARMED_STRIKE_ID}`);
  const damage = martialArtsDie ? withModifier(martialArtsDie, mod + extra) : String(Math.max(0, 1 + mod + extra));
  return {
    id: UNARMED_STRIKE_ID,
    kind: 'unarmed',
    name: 'Unarmed Strike',
    toHit: mod + pb + bonus('attack') + bonus(`attack:${UNARMED_STRIKE_ID}`) - d20Penalty,
    damage,
    damageType: 'Bludgeoning',
    properties: [`Grapple/Shove DC ${8 + mod + pb}`],
    proficient: true,
  };
}

export function computeWeaponAttacks(
  character: Character,
  registry: ContentRegistry,
  abilities: Abilities,
  prof: Proficiencies,
  pb: number,
  bonus: BonusFn,
  d20Penalty: number,
): AttackResult[] {
  const attacks: AttackResult[] = [];
  for (const entry of character.inventory) {
    if (!entry.equipped || !entry.itemId) continue;
    const weapon = registry.getOf('weapon', entry.itemId);
    if (!weapon) continue;
    const finesse = weapon.properties.some((p) => p.startsWith('Finesse'));
    const base = weapon.kind === 'ranged' ? abilities.dex.mod : abilities.str.mod;
    const mod = finesse ? Math.max(abilities.str.mod, abilities.dex.mod) : base;
    const proficient = isWeaponProficient(weapon, prof.weapons);
    attacks.push({
      id: entry.id,
      kind: 'weapon',
      name: entry.customName ?? weapon.name,
      toHit: mod + (proficient ? pb : 0) + bonus('attack') + bonus(`attack:${entry.id}`) - d20Penalty,
      damage: withModifier(weapon.damageDice, mod + bonus('damage') + bonus(`damage:${entry.id}`)),
      damageType: weapon.damageType,
      properties: weapon.properties,
      mastery: weapon.mastery,
      proficient,
    });
  }
  return attacks;
}
