import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { BOOKS, toBookPage, toPdfSpot, type BookId, type BookIndex, type BookIndexBook } from '../../content/books';
import { useI18n } from '../../i18n/i18n';
import { listBooks, loadBookBlob, loadBookIndex, loadReading, saveReading, type BookMeta, type ReadingPosition } from '../../storage/books';
import { useAppData } from '../data';
import { useMediaQuery } from '../hooks';
import { backHrefFromBooks, hrefFor } from '../router';
import { NARROW_QUERY } from '../sheet/Sheet';
import { BookSidePanel, type BookAvailability } from './BookSidePanel';
import { PageView } from './PageView';
import { openPdf, type PdfHandle } from './pdf';
import { nearestZoom, parseGoTo, serialRenders, stepZoom, ZOOM_STEPS } from './reader-logic';
import { BOOKS_CHANGED, pageMapFits } from './recognise';
import './books.css';

/** How long the reading position waits for more page turns before it is saved. */
const SAVE_DELAY_MS = 500;

type Positions = Partial<Record<BookId, ReadingPosition>>;
interface Loaded {
  books: BookMeta[];
  index: BookIndex | undefined;
  last: BookId | undefined;
}
type Doc = { bookId: BookId; pdf: PdfHandle } | { bookId: BookId; error: string };
interface Spot {
  pdfPage: number;
  half: 'whole' | 'left' | 'right';
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));
const inFormField = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName));

/** Full screen reader for the player's own scanned books: top bar, contents and search on the left, the page on the right. */
export function BookReader({ bookId: wanted, bookPage }: { bookId?: BookId; bookPage?: number }) {
  const { db } = useAppData();
  const { t } = useI18n();
  const narrow = useMediaQuery(NARROW_QUERY);
  const [loaded, setLoaded] = useState<Loaded>();
  const [loadError, setLoadError] = useState<string>();
  const positions = useRef<Positions>({});
  const [doc, setDoc] = useState<Doc>();
  const [spot, setSpot] = useState<Spot>();
  const [zoom, setZoom] = useState(1);
  const [notice, setNotice] = useState<string>();
  const [panelOpen, setPanelOpen] = useState(false);
  const [goTo, setGoTo] = useState('');

  useEffect(() => {
    let alive = true;
    const load = () =>
      Promise.all([listBooks(db), loadBookIndex(db), loadReading(db)]).then(
        ([books, index, reading]) => {
          if (!alive) return;
          positions.current = { ...reading.positions, ...positions.current };
          setLoaded({ books, index, last: reading.last });
        },
        (error: unknown) => alive && setLoadError(messageOf(error)),
      );
    void load();
    const reload = () => void load();
    window.addEventListener(BOOKS_CHANGED, reload);
    return () => {
      alive = false;
      window.removeEventListener(BOOKS_CHANGED, reload);
    };
  }, [db]);

  const present = (id: BookId | undefined) => loaded?.books.find((b) => b.bookId === id);
  const bookId = wanted ?? (present(loaded?.last) ? loaded?.last : loaded?.books[0]?.bookId);
  const meta = present(bookId);
  const indexBook: BookIndexBook | undefined =
    meta && pageMapFits(loaded?.index, meta.bookId, meta.pdfPages)
      ? loaded?.index?.books.find((b) => b.bookId === meta.bookId)
      : undefined;

  // pdf.js loads only now, inside the effect; the document closes when the book changes or the reader closes.
  const metaId = meta?.bookId;
  const metaAdded = meta?.addedAt;
  useEffect(() => {
    if (metaId === undefined) return;
    let alive = true;
    let opened: PdfHandle | undefined;
    setDoc(undefined);
    setSpot(undefined);
    void (async () => {
      const blob = await loadBookBlob(db, metaId);
      if (!blob) throw new Error(t('reader.missing', { title: BOOKS[metaId].title }));
      const pdf = serialRenders(await openPdf(blob));
      if (!alive) return void pdf.destroy().catch(() => undefined);
      opened = pdf;
      setDoc({ bookId: metaId, pdf });
    })().catch((error: unknown) => alive && setDoc({ bookId: metaId, error: messageOf(error) }));
    return () => {
      alive = false;
      void opened?.destroy().catch(() => undefined);
    };
    // metaAdded: a replaced file under the same book opens again. t only words an error, so it does not reopen the book.
  }, [db, metaId, metaAdded]);

  const pdf = doc && 'pdf' in doc && doc.bookId === bookId ? doc.pdf : undefined;
  const pageCount = pdf?.pageCount ?? 0;

  const spotOfPdf = useCallback(
    (pdfPage: number): Spot => {
      const pages = indexBook ? toBookPage(indexBook, pdfPage) : undefined;
      return { pdfPage, half: pages && pages.last > pages.first ? 'left' : 'whole' };
    },
    [indexBook],
  );
  /** Where a book page is, or undefined (with a notice) when it is not in this book. */
  const spotOfBookPage = useCallback(
    (page: number): Spot | undefined => {
      const found = indexBook ? toPdfSpot(indexBook, page) : page <= pageCount ? spotOfPdf(page) : undefined;
      if (!found || found.pdfPage > pageCount) {
        setNotice(t('reader.notInBook', { page }));
        return undefined;
      }
      setNotice(undefined);
      return found;
    },
    [indexBook, pageCount, spotOfPdf, t],
  );

  // On opening: the asked book page, else where you were, else the first page. A later link jumps within the book.
  const started = useRef<PdfHandle>(undefined);
  useEffect(() => {
    if (!pdf || !bookId) return;
    const fromRoute = bookPage !== undefined && indexBook ? spotOfBookPage(bookPage) : undefined;
    if (started.current === pdf) {
      if (fromRoute) setSpot(fromRoute);
      return;
    }
    started.current = pdf;
    const saved = positions.current[bookId];
    setZoom(saved ? nearestZoom(saved.zoom) : 1);
    setSpot(fromRoute ?? spotOfPdf(Math.min(Math.max(saved?.pdfPage ?? 1, 1), pdf.pageCount)));
    // Only a new document or a new link moves the page, not a reloaded index or a new language.
  }, [pdf, bookPage]);

  // Every page turn and zoom is saved, half a second after the last one; leaving the reader saves at once.
  const pending = useRef<{ bookId: BookId; position: ReadingPosition }>(undefined);
  const flush = useCallback(() => {
    const job = pending.current;
    pending.current = undefined;
    if (job) void saveReading(db, job.bookId, job.position).catch(() => undefined);
  }, [db]);
  useEffect(() => {
    if (!pdf || !bookId || !spot) return;
    if (pending.current && pending.current.bookId !== bookId) flush();
    const position = { pdfPage: spot.pdfPage, zoom };
    positions.current = { ...positions.current, [bookId]: position };
    pending.current = { bookId, position };
    const timer = setTimeout(flush, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pdf, bookId, spot, zoom, flush]);
  useEffect(() => flush, [flush]);

  const flip = useCallback(
    (direction: 1 | -1) => {
      if (!spot || !pdf) return;
      const next = spot.pdfPage + direction;
      if (next < 1 || next > pdf.pageCount) return;
      setNotice(undefined);
      setSpot(spotOfPdf(next));
    },
    [spot, pdf, spotOfPdf],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (inFormField(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight') flip(1);
      else if (e.key === 'ArrowLeft') flip(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flip]);

  const choose = (target: BookId, page: number) => {
    if (narrow) setPanelOpen(false);
    // The same link twice leaves the hash as it is, so jump here as well.
    if (target === bookId && pdf) {
      const found = indexBook ? spotOfBookPage(page) : undefined;
      if (found) setSpot(found);
    }
  };

  const submitGoTo = (e: FormEvent) => {
    e.preventDefault();
    const page = parseGoTo(goTo);
    if (page === undefined || !pdf) return;
    const found = spotOfBookPage(page);
    if (found) {
      setSpot(found);
      setGoTo('');
    }
  };

  const back = (
    <a className="button" href={backHrefFromBooks()}>
      <span aria-hidden="true">←</span> {t('nav.back')}
    </a>
  );
  const message = (text: string) => (
    <main className="screen">
      <header className="screen-header">{back}</header>
      <div className="card">
        <p role="status">{text}</p>
        <a className="button" href={hrefFor({ name: 'settings' })}>
          {t('reader.toSettings')}
        </a>
      </div>
    </main>
  );

  if (loadError !== undefined) return message(t('reader.openFailed', { reason: loadError }));
  if (!loaded) return null;
  if (loaded.books.length === 0) return message(t('reader.none'));
  if (!bookId || !meta) return message(t('reader.missing', { title: bookId ? BOOKS[bookId].title : '' }));

  const onScreen = spot && indexBook ? toBookPage(indexBook, spot.pdfPage) : undefined;
  const label = !spot
    ? ''
    : onScreen
      ? onScreen.first === onScreen.last
        ? t('reader.page', { page: onScreen.first })
        : t('reader.pages', { first: onScreen.first, last: onScreen.last })
      : t('reader.pdfPage', { page: spot.pdfPage });
  const available: BookAvailability = Object.fromEntries(
    loaded.books.map((b) => [b.bookId, pageMapFits(loaded.index, b.bookId, b.pdfPages) ? 'ok' : 'mismatch']),
  );
  // The index knows this book but was made for a PDF with another page count: say why the table of contents is off.
  const indexedPages = indexBook ? undefined : loaded.index?.books.find((b) => b.bookId === meta.bookId)?.pdfPages;
  const showPanel = !narrow || panelOpen;
  const failed = doc && 'error' in doc && doc.bookId === bookId ? doc.error : undefined;

  return (
    <div className={`book-reader${narrow ? ' narrow' : ''}`}>
      <div className="book-frame">
        <header className="book-bar">
          {back}
          <select
            className="book-choice"
            aria-label={t('reader.book')}
            value={bookId}
            onChange={(e) => {
              window.location.hash = hrefFor({ name: 'books', bookId: e.target.value as BookId });
            }}
          >
            {loaded.books.map((b) => (
              <option key={b.bookId} value={b.bookId}>
                {BOOKS[b.bookId].title}
              </option>
            ))}
          </select>
          <span className="book-page-label" data-testid="page-label">
            {label}
          </span>
          <span className="book-tools">
            {narrow && (
              <button
                type="button"
                className="book-panel-toggle"
                aria-label={t('reader.panel')}
                title={t('reader.panel')}
                aria-expanded={panelOpen}
                onClick={() => setPanelOpen(!panelOpen)}
              >
                <span aria-hidden="true">☰</span>
                <span className="book-panel-text" aria-hidden="true">
                  {t('reader.panel')}
                </span>
              </button>
            )}
            <button type="button" aria-label={t('reader.prev')} disabled={!spot || spot.pdfPage <= 1} onClick={() => flip(-1)}>
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              aria-label={t('reader.next')}
              disabled={!spot || spot.pdfPage >= pageCount}
              onClick={() => flip(1)}
            >
              <span aria-hidden="true">›</span>
            </button>
            <form className="book-goto" onSubmit={submitGoTo}>
              <input
                type="text"
                inputMode="numeric"
                enterKeyHint="go"
                aria-label={t('reader.goTo')}
                placeholder={t('reader.goTo')}
                value={goTo}
                onChange={(e) => setGoTo(e.target.value)}
              />
              <button type="submit">{t('reader.go')}</button>
            </form>
            <button type="button" aria-label={t('reader.zoomOut')} disabled={zoom <= ZOOM_STEPS[0]} onClick={() => setZoom(stepZoom(zoom, -1))}>
              <span aria-hidden="true">−</span>
            </button>
            <button
              type="button"
              aria-label={t('reader.zoomIn')}
              disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]!}
              onClick={() => setZoom(stepZoom(zoom, 1))}
            >
              <span aria-hidden="true">+</span>
            </button>
          </span>
        </header>
        {indexedPages !== undefined && (
          <p className="book-notice" role="status" data-testid="index-mismatch">
            {t('books.mismatch', { pdf: meta.pdfPages, expected: indexedPages })}
          </p>
        )}
        {notice && (
          <p className="book-notice" role="status">
            {notice}
          </p>
        )}
        <div className="book-body">
          {showPanel && (
            <aside className="book-side" aria-label={t('reader.panel')}>
              <BookSidePanel
                index={loaded.index}
                bookId={bookId}
                indexBook={indexBook}
                onScreen={onScreen}
                available={available}
                onChoose={choose}
              />
            </aside>
          )}
          {failed !== undefined ? (
            <p className="book-empty" role="alert">
              {t('reader.openFailed', { reason: failed })}
            </p>
          ) : pdf && spot ? (
            <PageView
              pdf={pdf}
              pdfPage={spot.pdfPage}
              half={spot.half}
              spread={spot.half !== 'whole'}
              zoom={zoom}
              label={label}
              onFlip={flip}
              onZoom={setZoom}
              onError={(error) => setDoc({ bookId, error: messageOf(error) })}
            />
          ) : (
            <p className="book-empty" role="status">
              {t('reader.opening')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
