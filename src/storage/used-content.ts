import type { ContentRegistry } from '../content/registry';
import type { ContentItem } from '../content/schema';
import type { Character } from '../model/character';

/** Content ids the character points at directly through its choices and inventory. */
export function directContentIds(character: Character): string[] {
  const { choices } = character;
  return [
    ...(choices.speciesId ? [choices.speciesId] : []),
    ...(choices.backgroundId ? [choices.backgroundId] : []),
    ...choices.levels.flatMap((l) => [l.classId, ...(l.subclassId ? [l.subclassId] : []), ...(l.featId ? [l.featId] : [])]),
    ...choices.bonusFeatIds,
    ...choices.featureOptions,
    ...choices.spells.flatMap((s) => [s.spellId, s.classId]),
    ...character.inventory.flatMap((i) => (i.itemId ? [i.itemId] : [])),
  ];
}

function childIds(item: ContentItem): string[] {
  switch (item.type) {
    case 'class':
      return item.levels.flatMap((l) => l.featureIds);
    case 'subclass':
      return [item.classId, ...item.features.map((f) => f.featureId)];
    case 'species':
      return item.traitIds;
    case 'background':
      return item.featId ? [item.featId] : [];
    case 'feature':
      return item.optionOf ? [item.optionOf] : [];
    default:
      return [];
  }
}

/** Every content id reachable from the character: its choices plus the features, traits and feats those bring along. */
export function reachableContentIds(character: Character, registry: ContentRegistry): Set<string> {
  const seen = new Set<string>();
  const queue = directContentIds(character);
  while (queue.length > 0) {
    const id = queue.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const item = registry.get(id);
    if (item) queue.push(...childIds(item));
  }
  return seen;
}

/**
 * The player's own items a character needs (spec §12: a character export carries them): items it reaches, and fills
 * of items it reaches. The registry must already include the own items, so fills of a subclass add their features.
 */
export function usedUserContent(character: Character, registry: ContentRegistry, userItems: readonly ContentItem[]): ContentItem[] {
  const ids = reachableContentIds(character, registry);
  return userItems.filter((item) => ids.has(item.id) || (item.fills !== undefined && ids.has(item.fills)));
}
