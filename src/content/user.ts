import { ContentItemSchema, type ContentItem, type ContentType } from './schema';

/** Spec §6: the player adds species, backgrounds, feats, spells, items and complete subclasses (with their features). */
export const USER_CONTENT_TYPES = [
  'feature', 'subclass', 'species', 'background', 'feat', 'spell', 'weapon', 'armor', 'gear', 'magic-item',
] as const satisfies readonly ContentType[];

/** Only features and subclasses can fill a built-in item (the skeleton subclasses and their features). */
export const FILLABLE_TYPES: readonly ContentType[] = ['feature', 'subclass'];

export interface UserContentIssue {
  index: number;
  id?: string;
  message: string;
}

export interface UserContentResult {
  items: ContentItem[];
  issues: UserContentIssue[];
}

/** A new id for the player's own item: user:<type>:<uuid>. */
export function userContentId(type: ContentType, uuid: string = crypto.randomUUID()): string {
  return `user:${type}:${uuid}`;
}

const idOf = (entry: unknown): string | undefined =>
  entry !== null && typeof entry === 'object' && typeof (entry as { id?: unknown }).id === 'string' ? (entry as { id: string }).id : undefined;

function problemWith(item: ContentItem, seen: ReadonlySet<string>): string | undefined {
  if (item.source !== 'user') return `source must be "user", not "${item.source}"`;
  if (!(USER_CONTENT_TYPES as readonly string[]).includes(item.type)) return `type "${item.type}" cannot be added as own content`;
  if (!new RegExp(`^user:${item.type}:[a-z0-9-]+$`).test(item.id)) return `id must look like user:${item.type}:<id>`;
  if (seen.has(item.id)) return 'duplicate id';
  if (item.fills !== undefined) {
    if (!FILLABLE_TYPES.includes(item.type)) return `a ${item.type} cannot fill another item`;
    if (!/^(srd|skeleton):/.test(item.fills)) return 'fills must point at a built-in item';
  }
  return undefined;
}

/**
 * The gate for content that is not built in (stored own content, imported files): a valid schema, source "user", an
 * id "user:<type>:<id>" so it can never replace a built-in item, no duplicates, and `fills` only on features and
 * subclasses, pointing at a built-in id. Invalid entries are reported with their position, never thrown.
 */
export function validateUserContent(raw: readonly unknown[]): UserContentResult {
  const items: ContentItem[] = [];
  const issues: UserContentIssue[] = [];
  const seen = new Set<string>();
  raw.forEach((entry, index) => {
    const parsed = ContentItemSchema.safeParse(entry);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      issues.push({ index, id: idOf(entry), message: `${issue.path.map(String).join('.') || 'item'}: ${issue.message}` });
      return;
    }
    const problem = problemWith(parsed.data, seen);
    if (problem) {
      issues.push({ index, id: parsed.data.id, message: problem });
      return;
    }
    seen.add(parsed.data.id);
    items.push(parsed.data);
  });
  return { items, issues };
}
