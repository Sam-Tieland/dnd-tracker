import type { ContentItem, ContentOf, ContentType } from './schema';

export interface ContentRegistry {
  get(id: string): ContentItem | undefined;
  getOf<T extends ContentType>(type: T, id: string): ContentOf<T> | undefined;
  list<T extends ContentType>(type: T): ContentOf<T>[];
}

const appendUnique = <T>(base: readonly T[], extra: readonly T[]): T[] => {
  const known = new Set(base.map((x) => JSON.stringify(x)));
  return [...base, ...extra.filter((x) => !known.has(JSON.stringify(x)))];
};

/**
 * A fill completes a built-in item and never takes anything away: a non-empty name or text replaces the target's,
 * effects come after the target's own effects (so the Eldritch Knight keeps its spellcasting), subclass features come
 * after the target's features, and an effect or feature the target already has counts once. The target keeps its id,
 * type, source and every other field (a subclass keeps its class).
 */
export function mergeFill(target: ContentItem, fill: ContentItem): ContentItem {
  const merged: Record<string, unknown> = { ...target };
  if (fill.name !== '') merged.name = fill.name;
  if ('text' in fill && fill.text !== '') merged.text = fill.text;
  if ('effects' in fill && 'effects' in target) merged.effects = appendUnique(target.effects, fill.effects);
  if (fill.type === 'subclass' && target.type === 'subclass') merged.features = appendUnique(target.features, fill.features);
  return merged as ContentItem;
}

/**
 * Built-in items first, then user items. A user item with `fills` pointing at an item of the same type is merged into
 * that item with mergeFill. Otherwise the user item stands alone.
 */
export function createRegistry(builtin: ContentItem[], user: ContentItem[] = []): ContentRegistry {
  const items = new Map<string, ContentItem>();
  for (const item of builtin) items.set(item.id, item);
  for (const item of user) {
    const target = item.fills ? items.get(item.fills) : undefined;
    if (target && target.type === item.type) items.set(target.id, mergeFill(target, item));
    else items.set(item.id, item);
  }
  return {
    get: (id) => items.get(id),
    getOf: <T extends ContentType>(type: T, id: string) => {
      const item = items.get(id);
      return item?.type === type ? (item as ContentOf<T>) : undefined;
    },
    list: <T extends ContentType>(type: T) => [...items.values()].filter((item): item is ContentOf<T> => item.type === type),
  };
}
