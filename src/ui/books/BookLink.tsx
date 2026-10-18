import { useEffect, useRef, useState } from 'react';
import { BOOKS, spotsFor, type BookId } from '../../content/books';
import { useI18n } from '../../i18n/i18n';
import { useToast } from '../components/Toast';
import { hrefFor, navigate } from '../router';
import { useBookIndex } from './use-book-index';

interface Spot {
  bookId: BookId;
  bookPage: number;
}

const hrefOf = (spot: Spot) => hrefFor({ name: 'books', bookId: spot.bookId, bookPage: spot.bookPage });

/** "In book": jumps to the page of the player's own PDF where these items are described. Renders nothing without a known page. */
export function BookLink({ contentIds, label }: { contentIds: string[]; label: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const { index, present, fits } = useBookIndex();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointer = (e: Event) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  if (!index) return null;
  const seen = new Set<string>();
  const spots: Spot[] = [];
  for (const id of contentIds) {
    for (const spot of spotsFor(index, id)) {
      const key = `${spot.bookId}:${spot.bookPage}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!present.has(spot.bookId) || fits(spot.bookId)) spots.push(spot);
    }
  }
  if (spots.length === 0) return null;

  const addBook = (bookId: BookId) =>
    toast({
      message: t('books.addBook', { title: BOOKS[bookId].title }),
      action: { label: t('nav.settings'), run: () => navigate({ name: 'settings' }) },
    });

  const first = spots[0]!;
  if (spots.length === 1 && present.has(first.bookId)) {
    return (
      <a
        className="button book-link"
        href={hrefOf(first)}
        aria-label={t('books.readIn', { label, title: BOOKS[first.bookId].title, page: first.bookPage })}
      >
        {t('books.inBook')}
      </a>
    );
  }
  if (spots.length === 1) {
    return (
      <button type="button" className="book-link book-link-missing" onClick={() => addBook(first.bookId)}>
        {t('books.inBook')}
      </button>
    );
  }
  return (
    <span className="book-link-wrap" ref={root}>
      <button type="button" className="book-link" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(!open)}>
        {t('books.inBook')}
      </button>
      {open && (
        <ul className="book-link-menu" aria-label={t('books.inBook')}>
          {spots.map((spot) => {
            const text = t('books.titlePage', { title: BOOKS[spot.bookId].title, page: spot.bookPage });
            return (
              <li key={`${spot.bookId}:${spot.bookPage}`}>
                {present.has(spot.bookId) ? (
                  <a className="button" href={hrefOf(spot)} onClick={() => setOpen(false)}>
                    {text}
                  </a>
                ) : (
                  <button
                    type="button"
                    className="book-link-missing"
                    onClick={() => {
                      setOpen(false);
                      addBook(spot.bookId);
                    }}
                  >
                    {text}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </span>
  );
}
