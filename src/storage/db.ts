import Dexie, { type Table } from 'dexie';
import type { BookId } from '../content/books';

/** Rows as stored: validated on the way in, migrated and validated again on the way out. */
export type StoredRow = { id: string } & Record<string, unknown>;

export interface SettingRow {
  key: string;
  value: unknown;
}

/** A book PDF kept on this device only; the Blob is stored as is so the whole file is never read into memory. */
export interface BookRow {
  bookId: BookId;
  name: string;
  size: number;
  pdfPages: number;
  blob: Blob;
  addedAt: string;
}

export type TrackerDb = Dexie & {
  characters: Table<StoredRow, string>;
  customContent: Table<StoredRow, string>;
  settings: Table<SettingRow, string>;
  books: Table<BookRow, string>;
};

/** Database version 2: characters, the player's own content, settings (spec §12) and book PDFs. */
export function openDb(name = 'dnd-tracker'): TrackerDb {
  const db = new Dexie(name) as TrackerDb;
  db.version(1).stores({ characters: 'id', customContent: 'id', settings: 'key' });
  db.version(2).stores({ characters: 'id', customContent: 'id', settings: 'key', books: 'bookId' });
  return db;
}
