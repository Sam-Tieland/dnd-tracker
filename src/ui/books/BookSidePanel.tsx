import { Fragment, useMemo, useState } from 'react';
import { searchIndex, tocTree, type BookId, type BookIndex, type BookIndexBook, type TocNode } from '../../content/books';
import { useI18n } from '../../i18n/i18n';
import { hrefFor } from '../router';

/** Short book names for the search results; book titles stay English in both languages. */
export const BOOK_SHORT: Record<BookId, string> = {
  'phb-2024': "Player's Handbook",
  xge: "Xanathar's",
  tce: "Tasha's",
};

/** Per book: on this device with a fitting index ('ok'), on this device without one ('mismatch'), or absent. */
export type BookAvailability = Partial<Record<BookId, 'ok' | 'mismatch'>>;

interface BookSidePanelProps {
  index: BookIndex | undefined;
  bookId: BookId;
  /** The index of the open book, only when it fits the PDF. */
  indexBook: BookIndexBook | undefined;
  /** The book pages on screen, to mark them in the table of contents. */
  onScreen: { first: number; last: number } | undefined;
  available: BookAvailability;
  onChoose(bookId: BookId, bookPage: number): void;
}

/** Marks every occurrence of the query in a title. */
function Marked({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  if (q === '') return <>{text}</>;
  const parts: Array<{ text: string; hit: boolean }> = [];
  const lower = text.toLowerCase();
  let at = 0;
  for (let i = lower.indexOf(q); i !== -1; i = lower.indexOf(q, at)) {
    if (i > at) parts.push({ text: text.slice(at, i), hit: false });
    parts.push({ text: text.slice(i, i + q.length), hit: true });
    at = i + q.length;
  }
  if (at < text.length) parts.push({ text: text.slice(at), hit: false });
  return (
    <>
      {/* Plain text between the marks, so the link's accessible name keeps its spaces. */}
      {parts.map((p, i) => (p.hit ? <mark key={i}>{p.text}</mark> : <Fragment key={i}>{p.text}</Fragment>))}
    </>
  );
}

/** The search field and, below it, either the table of contents of this book or the hits in all books. */
export function BookSidePanel({ index, bookId, indexBook, onScreen, available, onChoose }: BookSidePanelProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const tree = useMemo(() => (indexBook ? tocTree(indexBook) : []), [indexBook]);
  const hits = useMemo(() => (index ? searchIndex(index, query) : []), [index, query]);
  const searching = query.trim() !== '';

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const renderNode = (node: TocNode) => {
    const { entry } = node;
    const expanded = open.has(entry.id);
    const here = onScreen !== undefined && entry.bookPage >= onScreen.first && entry.bookPage <= onScreen.last;
    return (
      <li key={entry.id}>
        <div className="book-toc-row">
          {node.children.length > 0 ? (
            <button
              type="button"
              className="book-toc-toggle"
              aria-expanded={expanded}
              aria-label={t(expanded ? 'reader.collapse' : 'reader.expand', { title: entry.title })}
              onClick={() => toggle(entry.id)}
            >
              <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
            </button>
          ) : (
            <span className="book-toc-spacer" aria-hidden="true" />
          )}
          <a
            className={`book-link${here ? ' on' : ''}`}
            href={hrefFor({ name: 'books', bookId, bookPage: entry.bookPage })}
            {...(here ? { 'aria-current': 'page' as const } : {})}
            onClick={() => onChoose(bookId, entry.bookPage)}
          >
            <span>{entry.title}</span> <small>{t('reader.page', { page: entry.bookPage })}</small>
          </a>
        </div>
        {expanded && <ul className="book-toc">{node.children.map(renderNode)}</ul>}
      </li>
    );
  };

  return (
    <div className="book-side-inner">
      <input
        type="search"
        className="book-search"
        aria-label={t('reader.search')}
        placeholder={t('reader.search')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {searching ? (
        hits.length === 0 ? (
          <p className="muted">{t('reader.noHits')}</p>
        ) : (
          <ul className="book-hits">
            {hits.map(({ bookId: hitBook, entry }) => {
              const state = available[hitBook];
              const meta = `${BOOK_SHORT[hitBook]} · ${t(`reader.type.${entry.type}` as const)} · ${t('reader.page', { page: entry.bookPage })}`;
              const title = (
                <b>
                  <Marked text={entry.title} query={query} />
                </b>
              );
              return (
                <li key={`${hitBook}:${entry.id}`} className={state === 'ok' ? 'book-hit' : 'book-hit unavailable'}>
                  {state === 'ok' ? (
                    <a
                      className="book-link"
                      href={hrefFor({ name: 'books', bookId: hitBook, bookPage: entry.bookPage })}
                      onClick={() => onChoose(hitBook, entry.bookPage)}
                    >
                      {title} <small>{meta}</small>
                    </a>
                  ) : (
                    <div className="book-link">
                      {title} <small>{meta}</small>{' '}
                      <small>{state === 'mismatch' ? t('reader.indexMismatch') : t('books.notOnDevice')}</small>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )
      ) : indexBook ? (
        <>
          <ul className="book-toc">{tree.map(renderNode)}</ul>
          <p className="muted book-hint">{t('reader.tocHint')}</p>
        </>
      ) : (
        <p className="muted">{t('reader.noToc')}</p>
      )}
    </div>
  );
}
