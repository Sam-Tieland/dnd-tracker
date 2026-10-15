import type { Ability } from '../content/constants';
import type { ContentRegistry } from '../content/registry';
import type { ArmorTraining, ClassDef, Effect, WeaponProficiency } from '../content/schema';
import type { Character } from '../model/character';
import type { ClassLevel } from './types';

export interface Proficiencies {
  saves: Set<Ability>;
  skills: Set<string>;
  expertise: Set<string>;
  armor: Set<ArmorTraining>;
  weapons: Set<WeaponProficiency>;
  halfProficiency: boolean;
}

export function computeProficiencies(character: Character, registry: ContentRegistry, classLevels: ClassLevel[], effects: Effect[]): Proficiencies {
  const [first, ...others] = classLevels
    .map((cl) => registry.getOf('class', cl.classId))
    .filter((cls): cls is ClassDef => cls !== undefined);
  const saves = new Set<Ability>(first?.savingThrows ?? []);
  const armor = new Set<ArmorTraining>(first?.armorTraining ?? []);
  const weapons = new Set<WeaponProficiency>(first?.weaponProficiencies ?? []);
  for (const cls of others) {
    cls.multiclass.armorTraining.forEach((a) => armor.add(a));
    cls.multiclass.weaponProficiencies.forEach((w) => weapons.add(w));
  }

  const skills = new Set<string>(character.choices.skillProficiencies);
  const { backgroundId } = character.choices;
  const background = backgroundId ? registry.getOf('background', backgroundId) : undefined;
  background?.skillProficiencies.forEach((s) => skills.add(s));

  let halfProficiency = false;
  for (const effect of effects) {
    if (effect.kind === 'halfProficiency') halfProficiency = true;
    if (effect.kind !== 'proficiency') continue;
    const [kind, value] = effect.target.split(':');
    if (kind === 'save') saves.add(value as Ability);
    if (kind === 'skill') skills.add(value);
    if (kind === 'armor') armor.add(value as ArmorTraining);
    if (kind === 'weapon') weapons.add(value as WeaponProficiency);
  }
  return { saves, skills, expertise: new Set(character.choices.expertise), armor, weapons, halfProficiency };
}
