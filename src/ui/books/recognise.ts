import { BOOK_IDS, BOOKS, type BookId, type BookIndex } from '../../content/books';

/** Sent on window after every saved or removed book and every imported table of contents. */
export const BOOKS_CHANGED = 'dnd-books-changed';

const NAME_HINTS: Array<[RegExp, BookId]> = [
  [/phb|player/i, 'phb-2024'],
  [/xanathar/i, 'xge'],
  [/tasha/i, 'tce'],
];

/** First by the exact page count of the known scans, then by the file name. */
export function guessBook(fileName: string, pdfPages: number): BookId | undefined {
  const byPages = BOOK_IDS.find((id) => BOOKS[id].expectedPdfPages === pdfPages);
  if (byPages) return byPages;
  return NAME_HINTS.find(([pattern]) => pattern.test(fileName))?.[1];
}

/** True when the index has this book and was made for a PDF with exactly this many pages. */
export function pageMapFits(index: BookIndex | undefined, bookId: BookId, pdfPages: number): boolean {
  return index?.books.some((b) => b.bookId === bookId && b.pdfPages === pdfPages) ?? false;
}
