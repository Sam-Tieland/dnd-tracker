import { z } from 'zod';
import { slugify } from '../content/ids';
import type { ContentRegistry } from '../content/registry';
import type { ContentItem } from '../content/schema';
import { validateUserContent } from '../content/user';
import type { Character } from '../model/character';
import { MigrationError, migrateCharacter } from './migrations';
import { usedUserContent } from './used-content';

export const EXPORT_FORMAT = 'dnd-tracker-export';

/** Export file version 1 (spec §12). Characters and content are checked one by one in parseExportFile. */
export const ExportFileSchema = z.strictObject({
  format: z.literal(EXPORT_FORMAT),
  version: z.literal(1),
  kind: z.enum(['character', 'backup']),
  exportedAt: z.iso.datetime(),
  characters: z.array(z.unknown()),
  customContent: z.array(z.unknown()),
});

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: 1;
  kind: 'character' | 'backup';
  exportedAt: string;
  characters: Character[];
  customContent: ContentItem[];
}

/** One character with the own content it uses, also through fills of its skeleton subclass. */
export function buildCharacterExport(character: Character, registry: ContentRegistry, userItems: readonly ContentItem[], now: string): ExportFile {
  return { format: EXPORT_FORMAT, version: 1, kind: 'character', exportedAt: now, characters: [character], customContent: usedUserContent(character, registry, userItems) };
}

/** Every character and all own content. */
export function buildBackup(characters: readonly Character[], userItems: readonly ContentItem[], now: string): ExportFile {
  return { format: EXPORT_FORMAT, version: 1, kind: 'backup', exportedAt: now, characters: [...characters], customContent: [...userItems] };
}

export function serializeExport(file: ExportFile): string {
  return `${JSON.stringify(file, null, 2)}\n`;
}

/** "kael-stormborn-2026-10-16.json", or "dnd-tracker-backup-2026-10-16.json" for a backup. */
export function exportFileName(file: ExportFile): string {
  const date = file.exportedAt.slice(0, 10);
  if (file.kind === 'backup') return `dnd-tracker-backup-${date}.json`;
  return `${slugify(file.characters[0]?.name ?? '') || 'character'}-${date}.json`;
}

export type ImportErrorCode = 'not-json' | 'wrong-format' | 'newer-version' | 'invalid-character' | 'invalid-content';

export class ImportError extends Error {
  readonly code: ImportErrorCode;

  constructor(code: ImportErrorCode, message: string) {
    super(message);
    this.name = 'ImportError';
    this.code = code;
  }
}

export interface ParsedImport {
  kind: 'character' | 'backup';
  exportedAt: string;
  characters: Character[];
  customContent: ContentItem[];
}

const isNewerFile = (json: unknown): boolean => {
  const file = json as { format?: unknown; version?: unknown } | null;
  return file !== null && typeof file === 'object' && file.format === EXPORT_FORMAT && typeof file.version === 'number' && file.version > 1;
};

/**
 * The gate for imported files (spec §15): JSON in this format, every character migrated and valid, all own content
 * valid. Anything wrong throws an ImportError for the whole file, so nothing is written. Plan 1C builds the import
 * screen on top of this.
 */
export function parseExportFile(text: string): ParsedImport {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ImportError('not-json', 'The file is not valid JSON.');
  }
  if (isNewerFile(json)) throw new ImportError('newer-version', 'The file was made with a newer version of the app.');
  const file = ExportFileSchema.safeParse(json);
  if (!file.success) throw new ImportError('wrong-format', 'The file is not an export of this app.');
  const characters = file.data.characters.map((raw, index) => {
    try {
      return migrateCharacter(raw);
    } catch (error) {
      if (error instanceof MigrationError && error.code === 'newer-version') throw new ImportError('newer-version', error.message);
      throw new ImportError('invalid-character', `Character ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  const content = validateUserContent(file.data.customContent);
  if (content.issues.length > 0) {
    throw new ImportError('invalid-content', content.issues.map((i) => `${i.id ?? `#${i.index + 1}`}: ${i.message}`).join('; '));
  }
  return { kind: file.data.kind, exportedAt: file.data.exportedAt, characters, customContent: content.items };
}
