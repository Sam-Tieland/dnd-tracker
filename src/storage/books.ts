import { z } from 'zod';
import { BOOK_IDS, BookIndexSchema, type BookId, type BookIndex } from '../content/books';
import type { BookRow, TrackerDb } from './db';

export type BookMeta = Omit<BookRow, 'blob'>;

const INDEX_KEY = 'book-index';
const READING_KEY = 'book-reading';

/** One put: when it fails (for example quota), the previous copy of that book stays untouched. */
export async function saveBook(db: TrackerDb, row: BookRow): Promise<void> {
  await db.books.put(row);
}

export async function listBooks(db: TrackerDb): Promise<BookMeta[]> {
  const rows = await db.books.toArray();
  return rows
    .map(({ blob: _blob, ...meta }): BookMeta => meta)
    .sort((a, b) => BOOK_IDS.indexOf(a.bookId) - BOOK_IDS.indexOf(b.bookId));
}

export async function loadBookBlob(db: TrackerDb, bookId: BookId): Promise<Blob | undefined> {
  return (await db.books.get(bookId))?.blob;
}

export async function deleteBook(db: TrackerDb, bookId: BookId): Promise<void> {
  await db.transaction('rw', db.books, db.settings, async () => {
    await db.books.delete(bookId);
    const reading = await loadReading(db);
    if (bookId in reading.positions || reading.last === bookId) {
      const { [bookId]: _gone, ...positions } = reading.positions;
      await db.settings.put({
        key: READING_KEY,
        value: reading.last === bookId || reading.last === undefined ? { positions } : { last: reading.last, positions },
      });
    }
  });
}

export type IndexParseResult =
  | { ok: true; index: BookIndex }
  | { ok: false; reason: 'not-json' | 'wrong-format' | 'newer-version' | 'invalid'; detail?: string };

export function parseBookIndexFile(text: string): IndexParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    return { ok: false, reason: 'not-json' };
  }
  if (typeof data !== 'object' || data === null || (data as { format?: unknown }).format !== 'dnd-tracker-book-index') {
    return { ok: false, reason: 'wrong-format' };
  }
  const version = (data as { version?: unknown }).version;
  if (typeof version === 'number' && version > 1) return { ok: false, reason: 'newer-version' };
  const parsed = BookIndexSchema.safeParse(data);
  if (parsed.success) return { ok: true, index: parsed.data };
  const issue = parsed.error.issues[0];
  const detail = issue ? `${issue.path.join('.')}: ${issue.message}` : undefined;
  return { ok: false, reason: 'invalid', ...(detail === undefined ? {} : { detail }) };
}

export async function saveBookIndex(db: TrackerDb, index: BookIndex): Promise<void> {
  await db.settings.put({ key: INDEX_KEY, value: index });
}

/** Undefined when nothing is stored, or when the stored row cannot be read. */
export async function loadBookIndex(db: TrackerDb): Promise<BookIndex | undefined> {
  const row = await db.settings.get(INDEX_KEY);
  const parsed = BookIndexSchema.safeParse(row?.value);
  return parsed.success ? parsed.data : undefined;
}

export interface ReadingPosition {
  pdfPage: number;
  zoom: number;
}

const PositionSchema = z.object({ pdfPage: z.number().int().min(1), zoom: z.number().positive() });
const ReadingSchema = z.object({
  last: z.enum(BOOK_IDS).optional(),
  positions: z.partialRecord(z.enum(BOOK_IDS), PositionSchema),
});

export async function loadReading(
  db: TrackerDb,
): Promise<{ last?: BookId; positions: Partial<Record<BookId, ReadingPosition>> }> {
  const row = await db.settings.get(READING_KEY);
  const parsed = ReadingSchema.safeParse(row?.value);
  if (!parsed.success) return { positions: {} };
  return { ...(parsed.data.last === undefined ? {} : { last: parsed.data.last }), positions: parsed.data.positions };
}

export async function saveReading(db: TrackerDb, bookId: BookId, position: ReadingPosition): Promise<void> {
  const reading = await loadReading(db);
  await db.settings.put({
    key: READING_KEY,
    value: { last: bookId, positions: { ...reading.positions, [bookId]: position } },
  });
}
