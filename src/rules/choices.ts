import type { ContentRegistry } from '../content/registry';
import type { FeatureDef } from '../content/schema';
import type { Character } from '../model/character';

/** The option features of a parent feature, e.g. Protector and Thaumaturge for Divine Order. */
export function optionsFor(registry: ContentRegistry, parentId: string): FeatureDef[] {
  return registry.list('feature').filter((f) => f.optionOf === parentId);
}

/** Options outside an option group exclude each other (one per parent); Metamagic and invocations allow several. */
export function isExclusive(options: FeatureDef[]): boolean {
  return options.every((o) => o.optionGroup === undefined);
}

/** Turn an option on or off. Choosing an exclusive option replaces the other options of the same parent. */
export function toggleOption(character: Character, registry: ContentRegistry, optionId: string, on: boolean): Character {
  let ids = character.choices.featureOptions.filter((id) => id !== optionId);
  const parentId = registry.getOf('feature', optionId)?.optionOf;
  if (on && parentId !== undefined) {
    const siblings = optionsFor(registry, parentId);
    if (isExclusive(siblings)) ids = ids.filter((id) => !siblings.some((s) => s.id === id));
  }
  if (on) ids = [...ids, optionId];
  return { ...character, choices: { ...character.choices, featureOptions: ids } };
}
