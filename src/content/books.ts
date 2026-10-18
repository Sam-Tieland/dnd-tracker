import { z } from 'zod';

export const BOOK_IDS = ['phb-2024', 'xge', 'tce'] as const;
export type BookId = (typeof BOOK_IDS)[number];

export const BOOKS: Record<BookId, { title: string; expectedPdfPages: number }> = {
  'phb-2024': { title: "Player's Handbook (2024)", expectedPdfPages: 387 },
  xge: { title: "Xanathar's Guide to Everything", expectedPdfPages: 196 },
  tce: { title: "Tasha's Cauldron of Everything", expectedPdfPages: 194 },
};

export const BOOK_ENTRY_TYPES = [
  'chapter',
  'section',
  'class',
  'subclass',
  'feature',
  'spell',
  'feat',
  'species',
  'background',
] as const;
export type BookEntryType = (typeof BOOK_ENTRY_TYPES)[number];

/** Een reeks opeenvolgende pdf-pagina's met elk 1 of 2 boekpagina's; de eerste boekpagina van fromPdf is firstBook. */
export interface PageRange {
  fromPdf: number;
  toPdf: number;
  firstBook: number;
  perPdfPage: 1 | 2;
}
export interface BookEntry {
  id: string;
  title: string;
  type: BookEntryType;
  bookPage: number;
  parentId?: string;
  contentIds: string[];
}
export interface BookIndexBook {
  bookId: BookId;
  pdfPages: number;
  pageMap: PageRange[];
  entries: BookEntry[];
}
export interface BookIndex {
  format: 'dnd-tracker-book-index';
  version: 1;
  books: BookIndexBook[];
}

const PageRangeSchema = z.strictObject({
  fromPdf: z.number().int().min(1),
  toPdf: z.number().int().min(1),
  firstBook: z.number().int().min(0),
  perPdfPage: z.union([z.literal(1), z.literal(2)]),
});

const BookEntrySchema = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(BOOK_ENTRY_TYPES),
  bookPage: z.number().int().min(0),
  parentId: z.string().optional(),
  contentIds: z.array(z.string()),
});

const lastBookPage = (r: PageRange): number => r.firstBook + (r.toPdf - r.fromPdf + 1) * r.perPdfPage - 1;

const BookIndexBookSchema = z
  .strictObject({
    bookId: z.enum(BOOK_IDS),
    pdfPages: z.number().int().min(1),
    pageMap: z.array(PageRangeSchema),
    entries: z.array(BookEntrySchema),
  })
  .superRefine((book, ctx) => {
    const ids = new Set<string>();
    for (const [i, e] of book.entries.entries()) {
      if (ids.has(e.id)) ctx.addIssue({ code: 'custom', path: ['entries', i, 'id'], message: 'duplicate entry id' });
      ids.add(e.id);
    }
    for (const [i, e] of book.entries.entries()) {
      if (e.parentId !== undefined && !ids.has(e.parentId)) {
        ctx.addIssue({ code: 'custom', path: ['entries', i, 'parentId'], message: 'parent does not exist' });
      }
    }
    for (const [i, r] of book.pageMap.entries()) {
      if (r.fromPdf > r.toPdf) {
        ctx.addIssue({ code: 'custom', path: ['pageMap', i], message: 'fromPdf after toPdf' });
      }
      if (r.toPdf > book.pdfPages) {
        ctx.addIssue({ code: 'custom', path: ['pageMap', i, 'toPdf'], message: 'toPdf beyond pdfPages' });
      }
      for (let j = 0; j < i; j++) {
        const o = book.pageMap[j]!;
        const pdfOverlap = r.fromPdf <= o.toPdf && o.fromPdf <= r.toPdf;
        const bookOverlap = r.firstBook <= lastBookPage(o) && o.firstBook <= lastBookPage(r);
        if (pdfOverlap || bookOverlap) {
          ctx.addIssue({ code: 'custom', path: ['pageMap', i], message: 'overlapping ranges' });
        }
      }
    }
  });

export const BookIndexSchema: z.ZodType<BookIndex> = z
  .strictObject({
    format: z.literal('dnd-tracker-book-index'),
    version: z.literal(1),
    books: z.array(BookIndexBookSchema),
  })
  .superRefine((index, ctx) => {
    const seen = new Set<string>();
    for (const [i, b] of index.books.entries()) {
      if (seen.has(b.bookId)) ctx.addIssue({ code: 'custom', path: ['books', i, 'bookId'], message: 'duplicate bookId' });
      seen.add(b.bookId);
    }
  });

export type PdfSpot = { pdfPage: number; half: 'whole' | 'left' | 'right' };

export function toPdfSpot(book: BookIndexBook, bookPage: number): PdfSpot | undefined {
  for (const r of book.pageMap) {
    const offset = bookPage - r.firstBook;
    if (offset < 0) continue;
    const pdfPage = r.fromPdf + Math.floor(offset / r.perPdfPage);
    if (pdfPage > r.toPdf) continue;
    const half = r.perPdfPage === 1 ? 'whole' : offset % 2 === 0 ? 'left' : 'right';
    return { pdfPage, half };
  }
  return undefined;
}

export function toBookPage(book: BookIndexBook, pdfPage: number): { first: number; last: number } | undefined {
  for (const r of book.pageMap) {
    if (pdfPage < r.fromPdf || pdfPage > r.toPdf) continue;
    const first = r.firstBook + (pdfPage - r.fromPdf) * r.perPdfPage;
    return { first, last: first + r.perPdfPage - 1 };
  }
  return undefined;
}

export interface TocNode {
  entry: BookEntry;
  children: TocNode[];
}

/** Volgorde: bookPage, dan bestandsvolgorde. Entries met een onbekende parent worden wortels. */
export function tocTree(book: BookIndexBook): TocNode[] {
  const sorted = book.entries
    .map((entry, order) => ({ entry, order }))
    .sort((a, b) => a.entry.bookPage - b.entry.bookPage || a.order - b.order);
  const nodes = new Map<string, TocNode>();
  for (const { entry } of sorted) nodes.set(entry.id, { entry, children: [] });
  const roots: TocNode[] = [];
  for (const { entry } of sorted) {
    const node = nodes.get(entry.id)!;
    const parent = entry.parentId === undefined ? undefined : nodes.get(entry.parentId);
    (parent ? parent.children : roots).push(node);
  }
  return roots;
}

export interface SearchHit {
  bookId: BookId;
  entry: BookEntry;
}

export function searchIndex(index: BookIndex, query: string, limit = 50): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q === '') return [];
  const hits: Array<SearchHit & { prefix: boolean }> = [];
  for (const book of index.books) {
    for (const entry of book.entries) {
      const title = entry.title.toLowerCase();
      if (title.includes(q)) hits.push({ bookId: book.bookId, entry, prefix: title.startsWith(q) });
    }
  }
  hits.sort(
    (a, b) =>
      Number(b.prefix) - Number(a.prefix) ||
      BOOK_ENTRY_TYPES.indexOf(a.entry.type) - BOOK_ENTRY_TYPES.indexOf(b.entry.type) ||
      a.entry.title.localeCompare(b.entry.title) ||
      BOOK_IDS.indexOf(a.bookId) - BOOK_IDS.indexOf(b.bookId),
  );
  return hits.slice(0, limit).map(({ bookId, entry }) => ({ bookId, entry }));
}

export function spotsFor(index: BookIndex, contentId: string): { bookId: BookId; bookPage: number }[] {
  const spots: { bookId: BookId; bookPage: number }[] = [];
  for (const book of index.books) {
    for (const entry of book.entries) {
      if (entry.contentIds.includes(contentId)) spots.push({ bookId: book.bookId, bookPage: entry.bookPage });
    }
  }
  return spots.sort((a, b) => BOOK_IDS.indexOf(a.bookId) - BOOK_IDS.indexOf(b.bookId) || a.bookPage - b.bookPage);
}

export function unknownContentIds(index: BookIndex, known: (id: string) => boolean): string[] {
  const unknown = new Set<string>();
  for (const book of index.books) {
    for (const entry of book.entries) {
      for (const id of entry.contentIds) if (!known(id)) unknown.add(id);
    }
  }
  return [...unknown].sort();
}
