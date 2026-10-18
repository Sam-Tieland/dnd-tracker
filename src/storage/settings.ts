import { z } from 'zod';
import type { TrackerDb } from './db';

/** Every field falls back to its default on its own, so a later version can add settings without a migration. */
export const SettingsSchema = z.object({
  /** null: the language of the device (spec §11). */
  language: z.enum(['nl', 'en']).nullable().catch(null),
  theme: z.enum(['light', 'dark', 'auto']).catch('auto'),
  persistRequested: z.boolean().catch(false),
  lastExportAt: z.iso.datetime().nullable().catch(null),
  /** On: every roll asks what the player rolled with real dice, instead of rolling in the app. */
  physicalDice: z.boolean().catch(true),
});

export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = { language: null, theme: 'auto', persistRequested: false, lastExportAt: null, physicalDice: true };

const KEY = 'app';

export async function loadSettings(db: TrackerDb): Promise<Settings> {
  const row = await db.settings.get(KEY);
  const parsed = SettingsSchema.safeParse(row?.value ?? {});
  return parsed.success ? parsed.data : { ...DEFAULT_SETTINGS };
}

export async function saveSettings(db: TrackerDb, settings: Settings): Promise<void> {
  await db.settings.put({ key: KEY, value: SettingsSchema.parse(settings) });
}
