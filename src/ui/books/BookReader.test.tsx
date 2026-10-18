// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BookEntry, BookId, BookIndex, PageRange } from '../../content/books';
import { loadReading, saveBook, saveBookIndex } from '../../storage/books';
import type { TrackerDb } from '../../storage/db';
import { DEFAULT_SETTINGS, saveSettings } from '../../storage/settings';
import { NARROW_QUERY } from '../sheet/Sheet';
import { renderApp, setMatchMedia, testDb } from '../testing/render';
import { scrollForHalf } from './reader-logic';

/** The fake PDF's page count is the text of its Blob; pages from `spreadFrom` on are two book pages wide. */
const pdfState = vi.hoisted(() => ({
  renders: [] as Array<{ pdfPage: number; cssScale: number }>,
  spreadFrom: Infinity,
  destroyed: 0,
}));
vi.mock('./pdf', () => ({
  openPdf: async (blob: Blob) => {
    const pageCount = Number(await blob.text());
    return {
      pageCount,
      pageSize: async (pdfPage: number) => ({ width: pdfPage >= pdfState.spreadFrom ? 1224 : 612, height: 792 }),
      render: async (pdfPage: number, _canvas: HTMLCanvasElement, cssScale: number) => {
        pdfState.renders.push({ pdfPage, cssScale });
      },
      destroy: async () => {
        pdfState.destroyed++;
      },
    };
  },
}));

/** fake-indexeddb under jsdom loses a stored Blob's contents, so the stored book's file comes from here. */
const blobs = vi.hoisted(() => new Map<string, Blob>());
vi.mock('../../storage/books', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../storage/books')>();
  return { ...actual, loadBookBlob: async (_db: unknown, bookId: string) => blobs.get(bookId) };
});

const SPREADS: PageRange[] = [
  { fromPdf: 3, toPdf: 10, firstBook: 4, perPdfPage: 1 },
  { fromPdf: 11, toPdf: 20, firstBook: 12, perPdfPage: 2 },
];
const ALL_SPREADS: PageRange[] = [{ fromPdf: 3, toPdf: 20, firstBook: 2, perPdfPage: 2 }];
const entry = (id: string, title: string, type: BookEntry['type'], bookPage: number, parentId?: string): BookEntry => ({
  id,
  title,
  type,
  bookPage,
  ...(parentId === undefined ? {} : { parentId }),
  contentIds: [],
});
const TCE_ENTRIES = [
  entry('a', 'Chapter A', 'chapter', 4),
  entry('a1', 'Section A One', 'section', 6, 'a'),
  entry('dom', 'Test Domain', 'subclass', 14),
  entry('sanct', 'Test Gift', 'feature', 15, 'dom'),
];
const makeIndex = (books: Array<{ bookId: BookId; pdfPages: number; pageMap: PageRange[]; entries: BookEntry[] }>): BookIndex => ({
  format: 'dnd-tracker-book-index',
  version: 1,
  books,
});
const tceIndex = (pageMap: PageRange[] = SPREADS, pdfPages = 20) =>
  makeIndex([{ bookId: 'tce', pdfPages, pageMap, entries: TCE_ENTRIES }]);

async function setup(opts: { books?: Array<[BookId, number]>; index?: BookIndex } = {}): Promise<TrackerDb> {
  const db = testDb();
  await saveSettings(db, { ...DEFAULT_SETTINGS, language: 'nl', persistRequested: true });
  for (const [bookId, pdfPages] of opts.books ?? []) {
    const blob = new Blob([String(pdfPages)]);
    blobs.set(bookId, blob);
    await saveBook(db, { bookId, name: `${bookId}.pdf`, size: blob.size, pdfPages, blob, addedAt: 'now' });
  }
  if (opts.index) await saveBookIndex(db, opts.index);
  return db;
}

const lastRender = () => pdfState.renders.at(-1);
const pageLabel = () => screen.getByTestId('page-label').textContent;

let restoreWidth: (() => void) | undefined;
/** jsdom lays nothing out; the reading area pretends to be this wide. */
function viewWidth(px: number) {
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains('book-view') ? px : 0;
    },
  });
  restoreWidth = () => {
    if (original) Object.defineProperty(HTMLElement.prototype, 'clientWidth', original);
  };
}

beforeEach(() => {
  blobs.clear();
  pdfState.renders = [];
  pdfState.spreadFrom = Infinity;
  pdfState.destroyed = 0;
});
afterEach(() => {
  restoreWidth?.();
  restoreWidth = undefined;
});

describe('BookReader', () => {
  it('shows how to add books when there are none', async () => {
    renderApp('#/books', await setup());
    expect(await screen.findByText(/Er staan nog geen boeken op dit apparaat/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Naar Instellingen' }).getAttribute('href')).toBe('#/settings');
  });

  it('says when the requested book is not on this device', async () => {
    renderApp('#/books/xge', await setup({ books: [['tce', 20]] }));
    expect(await screen.findByText("Xanathar's Guide to Everything staat niet op dit apparaat")).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Naar Instellingen' }).getAttribute('href')).toBe('#/settings');
  });

  it('opens the requested book page', async () => {
    renderApp('#/books/tce/13', await setup({ books: [['tce', 20]], index: tceIndex() }));
    await waitFor(() => expect(lastRender()?.pdfPage).toBe(11));
    expect(pageLabel()).toBe('blz. 12–13');
    expect(screen.getByRole('link', { name: /Terug/ }).getAttribute('href')).toBe('#/');
  });

  it('opens a right-hand spread page scrolled to the right half', async () => {
    pdfState.spreadFrom = 11;
    viewWidth(800);
    renderApp('#/books/tce/13', await setup({ books: [['tce', 20]], index: tceIndex() }));
    await waitFor(() => expect(lastRender()?.pdfPage).toBe(11));
    const view = document.querySelector<HTMLElement>('.book-view')!;
    // One book page (half the spread, 612 pt) fits the 800 px reading area, so the spread is 1600 px wide.
    expect(lastRender()?.cssScale).toBeCloseTo(800 / 612);
    await waitFor(() => expect(view.scrollLeft).toBe(scrollForHalf('right', 1600, 800)));
    expect(view.scrollLeft).toBe(800);
  });

  it('pages forward and back by pdf page', async () => {
    renderApp('#/books/tce/5', await setup({ books: [['tce', 20]], index: tceIndex() }));
    const user = userEvent.setup();
    await waitFor(() => expect(lastRender()?.pdfPage).toBe(4));
    expect(pageLabel()).toBe('blz. 5');
    await user.click(screen.getByRole('button', { name: 'Volgende pagina' }));
    await waitFor(() => expect(lastRender()?.pdfPage).toBe(5));
    expect(pageLabel()).toBe('blz. 6');
    await user.click(screen.getByRole('button', { name: 'Vorige pagina' }));
    await waitFor(() => expect(lastRender()?.pdfPage).toBe(4));
  });

  it('goes to a book page from the field', async () => {
    renderApp('#/books/tce', await setup({ books: [['tce', 20]], index: tceIndex() }));
    const user = userEvent.setup();
    await waitFor(() => expect(lastRender()?.pdfPage).toBe(1));
    await user.type(screen.getByRole('textbox', { name: 'Ga naar blz.' }), '13{Enter}');
    await waitFor(() => expect(lastRender()?.pdfPage).toBe(11));
    expect(pageLabel()).toBe('blz. 12–13');
  });

  it('go to a page that is not in the book', async () => {
    renderApp('#/books/tce/13', await setup({ books: [['tce', 20]], index: tceIndex() }));
    const user = userEvent.setup();
    await waitFor(() => expect(lastRender()?.pdfPage).toBe(11));
    const before = pdfState.renders.length;
    await user.type(screen.getByRole('textbox', { name: 'Ga naar blz.' }), '999{Enter}');
    expect(await screen.findByText('Pagina 999 staat niet in dit boek')).toBeTruthy();
    expect(pdfState.renders.length).toBe(before);
    expect(pageLabel()).toBe('blz. 12–13');
  });

  it('zooms in and out in steps', async () => {
    viewWidth(612);
    renderApp('#/books/tce/5', await setup({ books: [['tce', 20]], index: tceIndex() }));
    const user = userEvent.setup();
    await waitFor(() => expect(lastRender()?.cssScale).toBe(1));
    await user.click(screen.getByRole('button', { name: 'Groter' }));
    await waitFor(() => expect(lastRender()?.cssScale).toBe(1.25));
    await user.click(screen.getByRole('button', { name: 'Kleiner' }));
    await waitFor(() => expect(lastRender()?.cssScale).toBe(1));
    expect((screen.getByRole('button', { name: 'Kleiner' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows the table of contents folded per chapter', async () => {
    renderApp('#/books/tce', await setup({ books: [['tce', 20]], index: tceIndex() }));
    const user = userEvent.setup();
    const chapter = await screen.findByRole('link', { name: /Chapter A/ });
    expect(chapter.getAttribute('href')).toBe('#/books/tce/4');
    expect(screen.queryByRole('link', { name: /Section A One/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Chapter A uitklappen' }));
    expect(screen.getByRole('link', { name: /Section A One/ }).getAttribute('href')).toBe('#/books/tce/6');
  });

  it('searches all books and opens a hit', async () => {
    const index = makeIndex([
      { bookId: 'tce', pdfPages: 20, pageMap: ALL_SPREADS, entries: TCE_ENTRIES },
      { bookId: 'xge', pdfPages: 30, pageMap: ALL_SPREADS, entries: [entry('x', 'Test Grove', 'section', 12)] },
    ]);
    renderApp('#/books/tce', await setup({ books: [['tce', 20], ['xge', 30]], index }));
    const user = userEvent.setup();
    await user.type(await screen.findByRole('searchbox', { name: 'Zoeken in je boeken' }), 'test');
    const hit = await screen.findByRole('link', { name: /Test Gift/ });
    expect(hit.textContent).toContain("Tasha's · feature · blz. 15");
    expect(screen.getByRole('link', { name: /Test Grove/ }).textContent).toContain("Xanathar's");
    await user.click(hit);
    expect(window.location.hash).toBe('#/books/tce/15');
    await waitFor(() => expect(lastRender()?.pdfPage).toBe(9));
    expect(pageLabel()).toBe('blz. 14–15');
  });

  it('marks hits in books that are not on this device', async () => {
    const index = makeIndex([
      { bookId: 'tce', pdfPages: 20, pageMap: ALL_SPREADS, entries: TCE_ENTRIES },
      { bookId: 'xge', pdfPages: 30, pageMap: ALL_SPREADS, entries: [entry('x', 'Test Grove', 'section', 12)] },
    ]);
    renderApp('#/books/tce', await setup({ books: [['tce', 20]], index }));
    const user = userEvent.setup();
    await user.type(await screen.findByRole('searchbox', { name: 'Zoeken in je boeken' }), 'test');
    await screen.findByRole('link', { name: /Test Gift/ });
    expect(screen.queryByRole('link', { name: /Test Grove/ })).toBeNull();
    const grove = screen.getAllByRole('listitem').find((li) => li.textContent?.startsWith('Test Grove'))!;
    expect(within(grove).getByText(/niet op dit apparaat/)).toBeTruthy();
    expect(grove.className).toContain('unavailable');
  });

  it('remembers where you were', async () => {
    const db = await setup({ books: [['tce', 20]], index: tceIndex() });
    const first = renderApp('#/books/tce/5', db);
    const user = userEvent.setup();
    await waitFor(() => expect(lastRender()?.pdfPage).toBe(4));
    await user.click(screen.getByRole('button', { name: 'Volgende pagina' }));
    await waitFor(async () => expect((await loadReading(db)).positions.tce?.pdfPage).toBe(5), { timeout: 2000 });
    expect((await loadReading(db)).last).toBe('tce');
    first.unmount();
    await waitFor(() => expect(pdfState.destroyed).toBe(1));
    pdfState.renders = [];
    renderApp('#/books', db);
    await waitFor(() => expect(lastRender()?.pdfPage).toBe(5));
    expect(pageLabel()).toBe('blz. 6');
  });

  it('reads by pdf page when the index does not fit', async () => {
    renderApp('#/books/tce', await setup({ books: [['tce', 200]], index: tceIndex(SPREADS, 194) }));
    const user = userEvent.setup();
    await waitFor(() => expect(lastRender()?.pdfPage).toBe(1));
    expect(pageLabel()).toBe('pdf-blz. 1');
    expect(screen.getByText('Geen inhoudsopgave voor deze PDF')).toBeTruthy();
    await user.type(screen.getByRole('textbox', { name: 'Ga naar blz.' }), '150{Enter}');
    await waitFor(() => expect(lastRender()?.pdfPage).toBe(150));
    expect(pageLabel()).toBe('pdf-blz. 150');
    await user.type(screen.getByRole('textbox', { name: 'Ga naar blz.' }), '201{Enter}');
    expect(await screen.findByText('Pagina 201 staat niet in dit boek')).toBeTruthy();
  });

  it('switches books from the top bar', async () => {
    renderApp('#/books/tce', await setup({ books: [['tce', 20], ['xge', 30]] }));
    const user = userEvent.setup();
    await waitFor(() => expect(lastRender()?.pdfPage).toBe(1));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Boek' }), 'xge');
    expect(window.location.hash).toBe('#/books/xge');
    await waitFor(() => expect(pdfState.destroyed).toBe(1));
  });

  it('folds the side panel on a narrow screen', async () => {
    setMatchMedia((q) => q === NARROW_QUERY);
    renderApp('#/books/tce', await setup({ books: [['tce', 20]], index: tceIndex() }));
    const user = userEvent.setup();
    const toggle = await screen.findByRole('button', { name: 'Inhoud / zoeken' });
    expect(screen.queryByRole('searchbox', { name: 'Zoeken in je boeken' })).toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await user.click(toggle);
    expect(screen.getByRole('searchbox', { name: 'Zoeken in je boeken' })).toBeTruthy();
    await user.click(screen.getByRole('link', { name: /Chapter A/ }));
    expect(window.location.hash).toBe('#/books/tce/4');
    expect(screen.queryByRole('searchbox', { name: 'Zoeken in je boeken' })).toBeNull();
  });
});
