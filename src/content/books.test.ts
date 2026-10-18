import { describe, expect, it } from 'vitest';
import {
  BookIndexSchema,
  searchIndex,
  spotsFor,
  tocTree,
  toBookPage,
  toPdfSpot,
  unknownContentIds,
  type BookIndex,
  type BookIndexBook,
} from './books';

const tce: BookIndexBook = {
  bookId: 'tce',
  pdfPages: 20,
  pageMap: [
    { fromPdf: 3, toPdf: 10, firstBook: 4, perPdfPage: 1 },
    { fromPdf: 11, toPdf: 20, firstBook: 12, perPdfPage: 2 },
  ],
  entries: [
    { id: 'c1', title: 'Chapter A', type: 'chapter', bookPage: 4, contentIds: [] },
    {
      id: 's1',
      title: 'Twilight Test Domain',
      type: 'subclass',
      bookPage: 34,
      parentId: 'c1',
      contentIds: ['user:subclass:x', 'skeleton:subclass:x'],
    },
    {
      id: 'f1',
      title: 'Twilight Test Sanctuary',
      type: 'feature',
      bookPage: 35,
      parentId: 's1',
      contentIds: ['user:feature:x-fill-2'],
    },
  ],
};

const phb: BookIndexBook = {
  bookId: 'phb-2024',
  pdfPages: 10,
  pageMap: [{ fromPdf: 1, toPdf: 10, firstBook: 1, perPdfPage: 1 }],
  entries: [
    { id: 'p1', title: 'Test Domain Overview', type: 'subclass', bookPage: 70, contentIds: ['skeleton:subclass:x'] },
  ],
};

const index: BookIndex = { format: 'dnd-tracker-book-index', version: 1, books: [tce, phb] };

describe('page mapping', () => {
  it('maps a single page', () => {
    expect(toPdfSpot(tce, 4)).toEqual({ pdfPage: 3, half: 'whole' });
    expect(toPdfSpot(tce, 10)).toEqual({ pdfPage: 9, half: 'whole' });
  });

  it('maps a book page on the left half of a spread', () => {
    expect(toPdfSpot(tce, 12)).toEqual({ pdfPage: 11, half: 'left' });
    expect(toPdfSpot(tce, 30)).toEqual({ pdfPage: 20, half: 'left' });
  });

  it('maps a book page on the right half of a spread', () => {
    expect(toPdfSpot(tce, 13)).toEqual({ pdfPage: 11, half: 'right' });
    expect(toPdfSpot(tce, 31)).toEqual({ pdfPage: 20, half: 'right' });
  });

  it('returns nothing for pages outside the map', () => {
    for (const p of [0, 3, 32]) expect(toPdfSpot(tce, p)).toBeUndefined();
    expect(toBookPage(tce, 1)).toBeUndefined();
  });

  it('names the book pages of a pdf page', () => {
    expect(toBookPage(tce, 3)).toEqual({ first: 4, last: 4 });
    expect(toBookPage(tce, 11)).toEqual({ first: 12, last: 13 });
  });
});

describe('search and tree', () => {
  it('searches names case-insensitively across books', () => {
    expect(searchIndex(index, 'twiLIGHT').map((h) => h.entry.id)).toEqual(['s1', 'f1']);
    expect(searchIndex(index, '  ')).toEqual([]);
    expect(searchIndex(index, 'light').map((h) => h.entry.id)).toEqual(['s1', 'f1']);
  });

  it('orders prefix matches first, then type, then title', () => {
    const ids = searchIndex(index, 'domain').map((h) => h.entry.id);
    expect(ids).toEqual(['p1', 's1']);
    expect(searchIndex(index, 'test').map((h) => h.entry.id)).toEqual(['p1', 's1', 'f1']);
  });

  it('respects the limit', () => {
    expect(searchIndex(index, 'test', 1)).toHaveLength(1);
  });

  it('builds the table of contents tree', () => {
    const tree = tocTree(tce);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.entry.id).toBe('c1');
    expect(tree[0]!.children[0]!.entry.id).toBe('s1');
    expect(tree[0]!.children[0]!.children[0]!.entry.id).toBe('f1');
  });
});

describe('content ids', () => {
  it('finds every spot of a content id', () => {
    expect(spotsFor(index, 'skeleton:subclass:x')).toEqual([
      { bookId: 'phb-2024', bookPage: 70 },
      { bookId: 'tce', bookPage: 34 },
    ]);
  });

  it('lists unknown content ids', () => {
    expect(unknownContentIds(index, (id) => id.startsWith('user:'))).toEqual(['skeleton:subclass:x']);
  });
});

describe('BookIndexSchema', () => {
  const wrap = (b: unknown) => ({ format: 'dnd-tracker-book-index', version: 1, books: [b] });
  const clone = () => structuredClone(tce) as unknown as Record<string, unknown>;

  it('accepts a valid index', () => {
    expect(BookIndexSchema.safeParse(index).success).toBe(true);
  });

  it('rejects a broken index', () => {
    expect(BookIndexSchema.safeParse(wrap({ ...clone(), bookId: 'nope' })).success).toBe(false);
    expect(
      BookIndexSchema.safeParse(wrap({ ...tce, entries: [{ ...tce.entries[1]!, parentId: 'missing' }] })).success,
    ).toBe(false);
    expect(
      BookIndexSchema.safeParse(wrap({ ...tce, entries: [tce.entries[0]!, { ...tce.entries[1]!, id: 'c1' }] })).success,
    ).toBe(false);
    expect(
      BookIndexSchema.safeParse(
        wrap({
          ...tce,
          pageMap: [
            { fromPdf: 3, toPdf: 10, firstBook: 4, perPdfPage: 1 },
            { fromPdf: 10, toPdf: 20, firstBook: 40, perPdfPage: 2 },
          ],
        }),
      ).success,
    ).toBe(false);
    expect(
      BookIndexSchema.safeParse(wrap({ ...tce, pageMap: [{ fromPdf: 3, toPdf: 10, firstBook: 4, perPdfPage: 3 }] }))
        .success,
    ).toBe(false);
    expect(
      BookIndexSchema.safeParse(wrap({ ...tce, entries: [{ ...tce.entries[0]!, extra: 1 }] })).success,
    ).toBe(false);
  });
});
