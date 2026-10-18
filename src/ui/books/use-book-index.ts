import { useEffect, useState } from 'react';
import type { BookId, BookIndex } from '../../content/books';
import { listBooks, loadBookIndex } from '../../storage/books';
import { useAppData } from '../data';
import { BOOKS_CHANGED, pageMapFits } from './recognise';

/** The stored table of contents and the books on this device; loads on mount and again after BOOKS_CHANGED. */
export function useBookIndex(): { index?: BookIndex; present: ReadonlySet<BookId>; fits: (bookId: BookId) => boolean } {
  const { db } = useAppData();
  const [state, setState] = useState<{ index?: BookIndex; pdfPages: ReadonlyMap<BookId, number> }>({ pdfPages: new Map() });
  useEffect(() => {
    let alive = true;
    const load = () =>
      Promise.all([listBooks(db), loadBookIndex(db)]).then(
        ([books, index]) => {
          if (alive) setState({ index, pdfPages: new Map(books.map((b) => [b.bookId, b.pdfPages])) });
        },
        () => {},
      );
    void load();
    const reload = () => void load();
    window.addEventListener(BOOKS_CHANGED, reload);
    return () => {
      alive = false;
      window.removeEventListener(BOOKS_CHANGED, reload);
    };
  }, [db]);
  const present = new Set(state.pdfPages.keys());
  const fits = (bookId: BookId) => {
    const pdfPages = state.pdfPages.get(bookId);
    return pdfPages !== undefined && pageMapFits(state.index, bookId, pdfPages);
  };
  return { index: state.index, present, fits };
}
