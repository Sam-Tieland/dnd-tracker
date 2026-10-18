import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it, vi } from 'vitest';
import type { BookIndex } from '../content/books';
import { openDb, type BookRow } from './db';
import {
  deleteBook,
  listBooks,
  loadBookBlob,
  loadBookIndex,
  loadReading,
  parseBookIndexFile,
  saveBook,
  saveBookIndex,
  saveReading,
} from './books';

const freshDb = () => openDb('test-' + crypto.randomUUID());

const row = (bookId: BookRow['bookId'], bytes = [37, 80, 68, 70]): BookRow => ({
  bookId,
  name: `${bookId}.pdf`,
  size: bytes.length,
  pdfPages: 3,
  blob: new Blob([new Uint8Array(bytes)]),
  addedAt: '2026-10-18T10:00:00.000Z',
});

const entry = (id: string) => ({ id, title: `Chapter ${id}`, type: 'chapter' as const, bookPage: 1, contentIds: [] });
const indexWith = (n: number): BookIndex => ({
  format: 'dnd-tracker-book-index',
  version: 1,
  books: [
    {
      bookId: 'xge',
      pdfPages: 3,
      pageMap: [{ fromPdf: 1, toPdf: 3, firstBook: 1, perPdfPage: 1 }],
      entries: Array.from({ length: n }, (_, i) => entry(`a${i}`)),
    },
  ],
});

describe('book storage', () => {
  it('stores a book and reads its blob back', async () => {
    const db = freshDb();
    await saveBook(db, row('xge'));
    const list = await listBooks(db);
    expect(list).toHaveLength(1);
    expect('blob' in list[0]!).toBe(false);
    expect(list[0]!.bookId).toBe('xge');
    const blob = await loadBookBlob(db, 'xge');
    expect(blob?.size).toBe(4);
  });

  it('lists books in BOOK_IDS order', async () => {
    const db = freshDb();
    await saveBook(db, row('tce'));
    await saveBook(db, row('phb-2024'));
    expect((await listBooks(db)).map((b) => b.bookId)).toEqual(['phb-2024', 'tce']);
  });

  it('opens a version 1 database and keeps its characters', async () => {
    const name = 'test-' + crypto.randomUUID();
    const old = new Dexie(name);
    old.version(1).stores({ characters: 'id', customContent: 'id', settings: 'key' });
    await old.table('characters').put({ id: 'c1' });
    old.close();
    const db = openDb(name);
    expect(await db.characters.get('c1')).toEqual({ id: 'c1' });
    expect(await db.books.count()).toBe(0);
  });

  it('keeps the old book when saving the new one fails', async () => {
    const db = freshDb();
    await saveBook(db, row('xge'));
    const err = new DOMException('full', 'QuotaExceededError');
    vi.spyOn(db.books, 'put').mockRejectedValueOnce(err);
    await expect(saveBook(db, row('xge', [1, 2, 3, 4, 5, 6]))).rejects.toBe(err);
    expect((await loadBookBlob(db, 'xge'))?.size).toBe(4);
  });

  it('deletes a book and its reading position', async () => {
    const db = freshDb();
    await saveBook(db, row('xge'));
    await saveBook(db, row('tce'));
    await saveReading(db, 'tce', { pdfPage: 2, zoom: 1 });
    await saveReading(db, 'xge', { pdfPage: 5, zoom: 2 });
    await deleteBook(db, 'xge');
    expect(await loadBookBlob(db, 'xge')).toBeUndefined();
    expect(await loadReading(db)).toEqual({ last: undefined, positions: { tce: { pdfPage: 2, zoom: 1 } } });
    await deleteBook(db, 'tce');
    expect(await loadReading(db)).toEqual({ positions: {} });
  });

  it('replaces the previous index', async () => {
    const db = freshDb();
    await saveBookIndex(db, indexWith(3));
    await saveBookIndex(db, indexWith(1));
    expect((await loadBookIndex(db))?.books[0]?.entries).toHaveLength(1);
  });

  it('ignores an invalid stored index', async () => {
    const db = freshDb();
    await db.settings.put({ key: 'book-index', value: { nope: true } });
    expect(await loadBookIndex(db)).toBeUndefined();
  });

  it('parses an index file', () => {
    const good = JSON.stringify(indexWith(1));
    expect(parseBookIndexFile('﻿' + good).ok).toBe(true);
    expect(parseBookIndexFile(good).ok).toBe(true);
    expect(parseBookIndexFile('{')).toMatchObject({ ok: false, reason: 'not-json' });
    expect(parseBookIndexFile('{"format":"other"}')).toMatchObject({ ok: false, reason: 'wrong-format' });
    expect(parseBookIndexFile('[]')).toMatchObject({ ok: false, reason: 'wrong-format' });
    const newer = JSON.stringify({ ...indexWith(1), version: 2 });
    expect(parseBookIndexFile(newer)).toMatchObject({ ok: false, reason: 'newer-version' });
    const broken = indexWith(1);
    (broken.books[0]!.entries[0] as { type: string }).type = 'bogus';
    const result = parseBookIndexFile(JSON.stringify(broken));
    expect(result).toMatchObject({ ok: false, reason: 'invalid' });
    expect(!result.ok && result.detail).toBeTruthy();
  });

  it('remembers the last book and its page', async () => {
    const db = freshDb();
    expect(await loadReading(db)).toEqual({ positions: {} });
    await saveReading(db, 'xge', { pdfPage: 12, zoom: 1.5 });
    expect(await loadReading(db)).toEqual({ last: 'xge', positions: { xge: { pdfPage: 12, zoom: 1.5 } } });
  });
});
