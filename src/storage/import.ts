import type { ContentItem } from '../content/schema';
import { CharacterSchema, type Character } from '../model/character';
import type { TrackerDb } from './db';
import type { ParsedImport } from './export';

export type CharacterImportMode = 'replace' | 'copy';

export interface ImportPlan {
  characters: { character: Character; exists: boolean }[];
  content: { item: ContentItem; exists: boolean }[];
}

export interface ImportResult {
  added: number;
  replaced: number;
  copied: number;
  content: number;
}

/** Looks at what is already stored, without writing. */
export async function planImport(db: TrackerDb, parsed: ParsedImport): Promise<ImportPlan> {
  const characterKeys = new Set(await db.characters.bulkGet(parsed.characters.map((c) => c.id)).then((rows) => rows.flatMap((r) => (r ? [r.id] : []))));
  const contentKeys = new Set(await db.customContent.bulkGet(parsed.customContent.map((i) => i.id)).then((rows) => rows.flatMap((r) => (r ? [r.id] : []))));
  return {
    characters: parsed.characters.map((character) => ({ character, exists: characterKeys.has(character.id) })),
    content: parsed.customContent.map((item) => ({ item, exists: contentKeys.has(item.id) })),
  };
}

/**
 * Writes the plan all or nothing: every character is validated before the first write, and all writes happen in one
 * transaction. An existing character without an explicit 'replace' is added as a copy, never overwritten.
 */
export async function applyImport(
  db: TrackerDb,
  plan: ImportPlan,
  modes: Record<string, CharacterImportMode>,
  now: string = new Date().toISOString(),
): Promise<ImportResult> {
  const result: ImportResult = { added: 0, replaced: 0, copied: 0, content: plan.content.length };
  const rows: Character[] = plan.characters.map(({ character, exists }) => {
    if (!exists) {
      result.added += 1;
      return CharacterSchema.parse(character);
    }
    if (modes[character.id] === 'replace') {
      result.replaced += 1;
      return CharacterSchema.parse(character);
    }
    result.copied += 1;
    return CharacterSchema.parse({ ...character, id: crypto.randomUUID(), createdAt: now, updatedAt: now });
  });
  await db.transaction('rw', db.characters, db.customContent, async () => {
    await db.characters.bulkPut(rows);
    await db.customContent.bulkPut(plan.content.map(({ item }) => item));
  });
  return result;
}
