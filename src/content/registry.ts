import type { ContentItem, ContentOf, ContentType } from './schema';

export interface ContentRegistry {
  get(id: string): ContentItem | undefined;
  getOf<T extends ContentType>(type: T, id: string): ContentOf<T> | undefined;
  list<T extends ContentType>(type: T): ContentOf<T>[];
}

/**
 * Built-in items first, then user items. A user item with `fills` pointing at an item of the same type
 * is merged into that item; the target keeps its own id and source. Otherwise the user item stands alone.
 */
export function createRegistry(builtin: ContentItem[], user: ContentItem[] = []): ContentRegistry {
  const items = new Map<string, ContentItem>();
  for (const item of builtin) items.set(item.id, item);
  for (const item of user) {
    const target = item.fills ? items.get(item.fills) : undefined;
    if (target && target.type === item.type) {
      const patch: Record<string, unknown> = { ...item };
      delete patch.id;
      delete patch.source;
      delete patch.fills;
      items.set(target.id, { ...target, ...patch } as ContentItem);
    } else {
      items.set(item.id, item);
    }
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
