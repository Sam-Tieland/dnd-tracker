import { useCallback, useEffect, useRef, useState } from 'react';
import { BOOK_IDS, BOOKS, unknownContentIds, type BookId, type BookIndex } from '../../content/books';
import { useI18n } from '../../i18n/i18n';
import {
  deleteBook,
  listBooks,
  loadBookIndex,
  parseBookIndexFile,
  saveBook,
  saveBookIndex,
  type BookMeta,
} from '../../storage/books';
import { requestPersistence } from '../../storage/persist';
import { Dialog } from '../components/Dialog';
import { useToast } from '../components/Toast';
import { useAppData } from '../data';
import { openPdf } from './pdf';
import { BOOKS_CHANGED, guessBook, pageMapFits } from './recognise';

interface Pending {
  file: File;
  pdfPages: number;
  choice: BookId | '';
}

const MB = 1024 * 1024;
const mb = (bytes: number) => (bytes / MB).toFixed(1);
/** Dexie wraps the browser's error, so the quota error can sit one level down in `inner`. */
const isQuotaError = (error: unknown): boolean => {
  const named = (e: unknown) => e instanceof Error && e.name === 'QuotaExceededError';
  return named(error) || (typeof error === 'object' && error !== null && 'inner' in error && named((error as { inner: unknown }).inner));
};
const changed = () => window.dispatchEvent(new Event(BOOKS_CHANGED));

/** The player's own book PDFs and table of contents, kept on this device only. */
export function BooksCard() {
  const { db, registry } = useAppData();
  const { t } = useI18n();
  const toast = useToast();
  const bookInput = useRef<HTMLInputElement>(null);
  const indexInput = useRef<HTMLInputElement>(null);
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [index, setIndex] = useState<BookIndex>();
  const [pending, setPending] = useState<Pending>();
  const [saving, setSaving] = useState(false);
  const [toRemove, setToRemove] = useState<BookId>();
  const [unknown, setUnknown] = useState<string[]>([]);
  const [storage, setStorage] = useState<{ used?: number; total?: number; persisted?: boolean }>({});

  const refresh = useCallback(async () => {
    const [list, idx] = await Promise.all([listBooks(db), loadBookIndex(db)]);
    setBooks(list);
    setIndex(idx);
    const manager = typeof navigator === 'undefined' ? undefined : navigator.storage;
    const estimate = await manager?.estimate?.().catch(() => undefined);
    const persisted = await manager?.persisted?.().catch(() => undefined);
    setStorage({
      ...(estimate?.usage === undefined || estimate.quota === undefined ? {} : { used: estimate.usage, total: estimate.quota }),
      ...(persisted === undefined ? {} : { persisted }),
    });
  }, [db]);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  const chooseBook = async (file: File | undefined) => {
    if (bookInput.current) bookInput.current.value = '';
    if (!file) return;
    try {
      const handle = await openPdf(file);
      const pdfPages = handle.pageCount;
      await handle.destroy();
      setPending({ file, pdfPages, choice: guessBook(file.name, pdfPages) ?? '' });
    } catch {
      toast({ message: t('books.notPdf'), error: true });
    }
  };

  const save = async () => {
    if (!pending || pending.choice === '' || saving) return;
    setSaving(true);
    try {
      const first = books.length === 0;
      await saveBook(db, {
        bookId: pending.choice,
        name: pending.file.name,
        size: pending.file.size,
        pdfPages: pending.pdfPages,
        blob: pending.file,
        addedAt: new Date().toISOString(),
      });
      setPending(undefined);
      // The book is stored; what follows is best-effort and never turns this into a failed save.
      if (first) await requestPersistence(navigator.storage).catch(() => undefined);
      await refresh().catch(() => undefined);
      changed();
      toast({ message: t('books.saved') });
    } catch (error) {
      const full = isQuotaError(error);
      const reason = error instanceof Error ? error.message : String(error);
      setPending(undefined);
      toast({ message: full ? t('books.noSpace') : t('books.failed', { reason }), error: true });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (bookId: BookId) => {
    setToRemove(undefined);
    try {
      await deleteBook(db, bookId);
      await refresh();
      changed();
      toast({ message: t('books.removed') });
    } catch (error) {
      toast({ message: t('books.failed', { reason: error instanceof Error ? error.message : String(error) }), error: true });
    }
  };

  const importIndex = async (file: File | undefined) => {
    if (indexInput.current) indexInput.current.value = '';
    if (!file) return;
    try {
      const result = parseBookIndexFile(await file.text());
      if (!result.ok) {
        const reason = t(`books.indexError.${result.reason}` as const) + (result.detail ? ` (${result.detail})` : '');
        toast({ message: t('books.indexFailed', { reason }), error: true });
        return;
      }
      await saveBookIndex(db, result.index);
      setUnknown(unknownContentIds(result.index, (id) => registry.get(id) !== undefined));
      await refresh();
      changed();
      const count = result.index.books.reduce((sum, b) => sum + b.entries.length, 0);
      toast({ message: count === 1 ? t('books.indexImportedOne') : t('books.indexImported', { count }) });
    } catch (error) {
      toast({ message: t('books.indexFailed', { reason: error instanceof Error ? error.message : String(error) }), error: true });
    }
  };

  const existing = pending && pending.choice !== '' ? books.find((b) => b.bookId === pending.choice) : undefined;
  const answer = (yes: boolean) => t(yes ? 'books.yes' : 'books.no');

  return (
    <section className="card">
      <h2>{t('books.section')}</h2>
      <p className="muted">{t('books.help')}</p>
      <ul className="plain-list">
        {BOOK_IDS.map((id) => {
          const book = books.find((b) => b.bookId === id);
          return (
            <li key={id}>
              <strong>{BOOKS[id].title}</strong>:{' '}
              {book ? t('books.fileInfo', { name: book.name, mb: mb(book.size) }) : <span className="muted">{t('books.notOnDevice')}</span>}{' '}
              {book && (
                <button type="button" aria-label={t('books.removeLabel', { title: BOOKS[id].title })} onClick={() => setToRemove(id)}>
                  {t('books.remove')}
                </button>
              )}
              {book && index && !pageMapFits(index, id, book.pdfPages) && index.books.some((b) => b.bookId === id) && (
                <p className="warning" role="status">
                  {t('books.mismatch', {
                    pdf: book.pdfPages,
                    expected: index.books.find((b) => b.bookId === id)?.pdfPages ?? 0,
                  })}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {(storage.used !== undefined || storage.persisted !== undefined) && (
        <p className="muted">
          {storage.used !== undefined && storage.total !== undefined && (
            <>
              {t('books.usage', { used: mb(storage.used), total: mb(storage.total) })}
              <br />
            </>
          )}
          {storage.persisted !== undefined && t('books.persisted', { answer: answer(storage.persisted) })}
        </p>
      )}
      <button type="button" onClick={() => bookInput.current?.click()}>
        {t('books.add')}
      </button>{' '}
      <button type="button" onClick={() => indexInput.current?.click()}>
        {t('books.importIndex')}
      </button>
      {unknown.length > 0 && (
        <details>
          <summary>{unknown.length === 1 ? t('books.unknownOne') : t('books.unknown', { count: unknown.length })}</summary>
          <ul className="plain-list">
            {unknown.map((id) => (
              <li key={id}>{id}</li>
            ))}
          </ul>
        </details>
      )}
      <input
        ref={bookInput}
        type="file"
        accept=".pdf,application/pdf"
        data-testid="book-input"
        hidden
        onChange={(e) => void chooseBook(e.target.files?.[0])}
      />
      <input
        ref={indexInput}
        type="file"
        accept=".json,application/json"
        data-testid="book-index-input"
        hidden
        onChange={(e) => void importIndex(e.target.files?.[0])}
      />
      {toRemove && (
        <Dialog
          title={t('books.removeTitle')}
          onClose={() => setToRemove(undefined)}
          actions={
            <button type="button" className="danger" onClick={() => void remove(toRemove)}>
              {t('books.remove')}
            </button>
          }
        >
          <p>{t('books.removeConfirm', { title: BOOKS[toRemove].title })}</p>
        </Dialog>
      )}
      {pending && (
        <Dialog
          title={t('books.which')}
          dismissible={!saving}
          onClose={() => setPending(undefined)}
          actions={
            <button type="button" className="primary" disabled={pending.choice === '' || saving} onClick={() => void save()}>
              {t('books.save')}
            </button>
          }
        >
          <p className="muted">{pending.file.name}</p>
          <select
            aria-label={t('books.which')}
            value={pending.choice}
            onChange={(e) => setPending({ ...pending, choice: e.target.value as BookId | '' })}
          >
            <option value="">{t('books.choose')}</option>
            {BOOK_IDS.map((id) => (
              <option key={id} value={id}>
                {BOOKS[id].title}
              </option>
            ))}
          </select>
          {existing && <p>{t('books.replaces', { name: existing.name })}</p>}
          {saving && (
            <p className="muted" role="status">
              {t('books.saving')}
            </p>
          )}
        </Dialog>
      )}
    </section>
  );
}
