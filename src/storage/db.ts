import Dexie, { type Table } from 'dexie';

/** Rows as stored: validated on the way in, migrated and validated again on the way out. */
export type StoredRow = { id: string } & Record<string, unknown>;

export interface SettingRow {
  key: string;
  value: unknown;
}

export type TrackerDb = Dexie & {
  characters: Table<StoredRow, string>;
  customContent: Table<StoredRow, string>;
  settings: Table<SettingRow, string>;
};

/** Database version 1 (spec §12): characters, the player's own content and settings. */
export function openDb(name = 'dnd-tracker'): TrackerDb {
  const db = new Dexie(name) as TrackerDb;
  db.version(1).stores({ characters: 'id', customContent: 'id', settings: 'key' });
  return db;
}
