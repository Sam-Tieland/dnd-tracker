import { useCallback, useSyncExternalStore } from 'react';
import type { BookId, BookIndex } from '../../content/books';
import { listBooks, loadBookIndex } from '../../storage/books';
import type { TrackerDb } from '../../storage/db';
import { useAppData } from '../data';
import { BOOKS_CHANGED, pageMapFits } from './recognise';

interface Snapshot {
  index?: BookIndex;
  pdfPages: ReadonlyMap<BookId, number>;
}

const EMPTY: Snapshot = { pdfPages: new Map() };

/** One store per database: all BookLinks on a sheet share a single load, and a single BOOKS_CHANGED listener. */
class BookStore {
  snapshot: Snapshot = EMPTY;
  private listeners = new Set<() => void>();
  private inflight: Promise<void> | undefined;
  private stale = false;

  constructor(private db: TrackerDb) {}

  private onChanged = () => this.load();

  private load() {
    if (this.inflight) {
      this.stale = true; // changed while loading: load once more afterwards
      return;
    }
    this.inflight = Promise.all([listBooks(this.db), loadBookIndex(this.db)])
      .then(([books, index]) => {
        this.snapshot = { index, pdfPages: new Map(books.map((b) => [b.bookId, b.pdfPages])) };
        this.listeners.forEach((l) => l());
      })
      .catch(() => {})
      .finally(() => {
        this.inflight = undefined;
        if (this.stale && this.listeners.size > 0) {
          this.stale = false;
          this.load();
        }
      });
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    if (this.listeners.size === 1) {
      window.addEventListener(BOOKS_CHANGED, this.onChanged);
      this.load();
    }
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) window.removeEventListener(BOOKS_CHANGED, this.onChanged);
    };
  };

  getSnapshot = () => this.snapshot;
}

const stores = new WeakMap<TrackerDb, BookStore>();
const storeFor = (db: TrackerDb) => {
  let store = stores.get(db);
  if (!store) {
    store = new BookStore(db);
    stores.set(db, store);
  }
  return store;
};

/** The stored table of contents and the books on this device; shared load, reloads after BOOKS_CHANGED. */
export function useBookIndex(): { index?: BookIndex; present: ReadonlySet<BookId>; fits: (bookId: BookId) => boolean } {
  const { db } = useAppData();
  const store = storeFor(db);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const fits = useCallback(
    (bookId: BookId) => {
      const pdfPages = state.pdfPages.get(bookId);
      return pdfPages !== undefined && pageMapFits(state.index, bookId, pdfPages);
    },
    [state],
  );
  return { index: state.index, present: new Set(state.pdfPages.keys()), fits };
}
