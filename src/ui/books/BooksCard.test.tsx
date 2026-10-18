// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BookIndex } from '../../content/books';
import { listBooks, loadBookIndex, saveBook, saveBookIndex } from '../../storage/books';
import { renderApp, testDb } from '../testing/render';
import { BOOKS_CHANGED, guessBook, pageMapFits } from './recognise';

const pdfState = vi.hoisted(() => ({ pages: 194 }));
vi.mock('./pdf', () => ({
  openPdf: async () => ({ pageCount: pdfState.pages, destroy: async () => undefined }),
}));
const saveState = vi.hoisted(() => ({ fail: undefined as Error | undefined }));
vi.mock('../../storage/books', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../storage/books')>();
  return {
    ...actual,
    saveBook: async (...args: Parameters<typeof actual.saveBook>) => {
      if (saveState.fail) throw saveState.fail;
      return actual.saveBook(...args);
    },
  };
});

const pdfFile = (name: string) => new File(['%PDF-fake'], name, { type: 'application/pdf' });
const indexFor = (pdfPages: number, contentIds: string[] = []): BookIndex => ({
  format: 'dnd-tracker-book-index',
  version: 1,
  books: [
    {
      bookId: 'tce',
      pdfPages,
      pageMap: [{ fromPdf: 1, toPdf: pdfPages, firstBook: 1, perPdfPage: 1 }],
      entries: [{ id: 'a', title: 'Chapter A', type: 'chapter', bookPage: 1, contentIds }],
    },
  ],
});
const jsonFile = (text: string) => new File([text], 'index.json', { type: 'application/json' });
const row = (bookId: 'tce' | 'xge' | 'phb-2024', name: string, pdfPages: number) => ({
  bookId,
  name,
  size: 10,
  pdfPages,
  blob: new Blob(['x']),
  addedAt: 'now',
});

beforeEach(() => {
  pdfState.pages = 194;
  saveState.fail = undefined;
});

describe('recognise', () => {
  it('guesses by page count first, then by name', () => {
    expect(guessBook('anything.pdf', 387)).toBe('phb-2024');
    expect(guessBook('anything.pdf', 196)).toBe('xge');
    expect(guessBook('Tasha.pdf', 200)).toBe('tce');
    expect(guessBook('Xanathar.pdf', 200)).toBe('xge');
    expect(guessBook('Players Handbook.pdf', 200)).toBe('phb-2024');
    expect(guessBook('PHB.pdf', 200)).toBe('phb-2024');
    expect(guessBook('other.pdf', 200)).toBeUndefined();
  });

  it('checks whether the page map fits', () => {
    expect(pageMapFits(undefined, 'tce', 194)).toBe(false);
    expect(pageMapFits(indexFor(194), 'xge', 194)).toBe(false);
    expect(pageMapFits(indexFor(194), 'tce', 200)).toBe(false);
    expect(pageMapFits(indexFor(194), 'tce', 194)).toBe(true);
  });
});

describe('BooksCard', () => {
  it('adds a book after confirming which one it is', async () => {
    const { db } = renderApp('#/settings');
    const user = userEvent.setup();
    const changed = vi.fn();
    window.addEventListener(BOOKS_CHANGED, changed);
    await user.upload(await screen.findByTestId('book-input'), pdfFile("Tasha's Cauldron of Everything.pdf"));
    const dialog = await screen.findByRole('dialog', { name: 'Which book is this?' });
    expect((within(dialog).getByRole('combobox') as HTMLSelectElement).value).toBe('tce');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(/Tasha's Cauldron of Everything\.pdf/)).toBeTruthy();
    expect((await listBooks(db)).map((b) => b.bookId)).toEqual(['tce']);
    expect(changed).toHaveBeenCalled();
    window.removeEventListener(BOOKS_CHANGED, changed);
  });

  it('lets the player pick another book', async () => {
    const { db } = renderApp('#/settings');
    const user = userEvent.setup();
    pdfState.pages = 200;
    await user.upload(await screen.findByTestId('book-input'), pdfFile('scan.pdf'));
    const dialog = await screen.findByRole('dialog', { name: 'Which book is this?' });
    const select = within(dialog).getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('');
    await user.selectOptions(select, 'phb-2024');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(async () => expect((await listBooks(db)).map((b) => b.bookId)).toEqual(['phb-2024']));
  });

  it('says what a new file replaces', async () => {
    const db = testDb();
    await saveBook(db, row('tce', 'old.pdf', 194));
    renderApp('#/settings', db);
    const user = userEvent.setup();
    await user.upload(await screen.findByTestId('book-input'), pdfFile('new.pdf'));
    expect(await screen.findByText('This replaces old.pdf')).toBeTruthy();
  });

  it('reports a full device', async () => {
    const { db } = renderApp('#/settings');
    const user = userEvent.setup();
    saveState.fail = Object.assign(new Error('full'), { name: 'QuotaExceededError' });
    await user.upload(await screen.findByTestId('book-input'), pdfFile("Tasha's Cauldron of Everything.pdf"));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(/too little space/)).toBeTruthy();
    expect(await listBooks(db)).toEqual([]);
    expect(screen.queryByText(/Tasha's Cauldron of Everything\.pdf/)).toBeNull();
  });

  it('imports the table of contents', async () => {
    const { db } = renderApp('#/settings');
    const user = userEvent.setup();
    const changed = vi.fn();
    window.addEventListener(BOOKS_CHANGED, changed);
    await user.upload(await screen.findByTestId('book-index-input'), jsonFile(JSON.stringify(indexFor(194))));
    expect(await screen.findByText('Table of contents imported: 1 items')).toBeTruthy();
    expect((await loadBookIndex(db))?.books[0]?.bookId).toBe('tce');
    expect(changed).toHaveBeenCalled();
    window.removeEventListener(BOOKS_CHANGED, changed);
  });

  it('reports content ids the app does not know', async () => {
    renderApp('#/settings');
    const user = userEvent.setup();
    await user.upload(
      await screen.findByTestId('book-index-input'),
      jsonFile(JSON.stringify(indexFor(194, ['user:feature:bestaat-niet']))),
    );
    expect(await screen.findByText(/1 items not found in the app/)).toBeTruthy();
    expect(screen.getByText('user:feature:bestaat-niet')).toBeTruthy();
  });

  it('rejects a file that is not an index', async () => {
    const { db } = renderApp('#/settings');
    const user = userEvent.setup();
    await user.upload(await screen.findByTestId('book-index-input'), jsonFile('{"hello":1}'));
    expect(await screen.findByText(/not a table of contents for this app/)).toBeTruthy();
    expect(await loadBookIndex(db)).toBeUndefined();
  });

  it('warns when the pdf does not match the index', async () => {
    const db = testDb();
    await saveBook(db, row('tce', 'tce.pdf', 200));
    await saveBookIndex(db, indexFor(194));
    renderApp('#/settings', db);
    expect(await screen.findByText(/This PDF has 200 pages; the table of contents expects 194/)).toBeTruthy();
  });

  it('removes a book', async () => {
    const db = testDb();
    await saveBook(db, row('tce', 'tce.pdf', 194));
    renderApp('#/settings', db);
    const user = userEvent.setup();
    await screen.findByText(/tce\.pdf/);
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(async () => expect(await listBooks(db)).toEqual([]));
    expect(screen.queryByText(/tce\.pdf/)).toBeNull();
  });
});
