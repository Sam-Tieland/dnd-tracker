import { z } from 'zod';
import type { TrackerDb } from './db';

/** The player's own fillable character sheet, kept on this device. It lives in its own settings row, never in a backup. */
export interface SheetTemplate {
  name: string;
  bytes: Uint8Array;
  savedAt: string;
}

const KEY = 'sheet-template';

const TemplateSchema = z.object({
  name: z.string(),
  bytes: z.custom<Uint8Array>((v) => ArrayBuffer.isView(v), 'bytes'),
  savedAt: z.string(),
});

export async function saveSheetTemplate(db: TrackerDb, template: SheetTemplate): Promise<void> {
  await db.settings.put({ key: KEY, value: template });
}

/** Undefined when nothing is stored, or when the stored row cannot be read. */
export async function loadSheetTemplate(db: TrackerDb): Promise<SheetTemplate | undefined> {
  const row = await db.settings.get(KEY);
  const parsed = TemplateSchema.safeParse(row?.value);
  // Copied into a plain Uint8Array of this realm, whatever the database handed back.
  return parsed.success ? { ...parsed.data, bytes: Uint8Array.from(parsed.data.bytes) } : undefined;
}

export async function deleteSheetTemplate(db: TrackerDb): Promise<void> {
  await db.settings.delete(KEY);
}
