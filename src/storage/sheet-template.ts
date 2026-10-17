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
  bytes: z.custom<Uint8Array | ArrayBuffer>((v) => v instanceof Uint8Array || v instanceof ArrayBuffer || Object.prototype.toString.call(v) === '[object Uint8Array]' || Object.prototype.toString.call(v) === '[object ArrayBuffer]', 'bytes'),
  savedAt: z.string(),
});

export async function saveSheetTemplate(db: TrackerDb, template: SheetTemplate): Promise<void> {
  await db.settings.put({ key: KEY, value: template });
}

/** Undefined when nothing is stored, or when the stored row cannot be read. */
export async function loadSheetTemplate(db: TrackerDb): Promise<SheetTemplate | undefined> {
  const row = await db.settings.get(KEY);
  const parsed = TemplateSchema.safeParse(row?.value);
  // Copied (typed-array copy) into a Uint8Array of this realm, whatever the database handed back.
  return parsed.success ? { ...parsed.data, bytes: new Uint8Array(parsed.data.bytes) } : undefined;
}

export async function deleteSheetTemplate(db: TrackerDb): Promise<void> {
  await db.settings.delete(KEY);
}
