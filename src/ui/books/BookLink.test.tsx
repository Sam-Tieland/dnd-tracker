// @vitest-environment jsdom
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { BookEntry, BookId, BookIndex } from '../../content/books';
import * as storage from '../../storage/books';
import { saveBook, saveBookIndex } from '../../storage/books';
import type { TrackerDb } from '../../storage/db';
import { DEFAULT_SETTINGS, saveSettings } from '../../storage/settings';
import { renderWithProviders, testDb } from '../testing/render';
import { BookLink } from './BookLink';
import { BOOKS_CHANGED } from './recognise';

const entry = (id: string, bookPage: number, contentIds: string[]): BookEntry => ({ id, title: `Entry ${id}`, type: 'feature', bookPage, contentIds });
const book = (bookId: BookId, entries: BookEntry[], pdfPages = 20) => ({
  bookId,
  pdfPages,
  pageMap: [{ fromPdf: 1, toPdf: pdfPages, firstBook: 1, perPdfPage: 1 as const }],
  entries,
});
const index = (...books: BookIndex['books']): BookIndex => ({ format: 'dnd-tracker-book-index', version: 1, books });

async function setup(opts: { index?: BookIndex; books?: Array<[BookId, number]> }): Promise<TrackerDb> {
  const db = testDb();
  await saveSettings(db, { ...DEFAULT_SETTINGS, language: 'nl', persistRequested: true });
  for (const [bookId, pdfPages] of opts.books ?? []) {
    await saveBook(db, { bookId, name: `${bookId}.pdf`, size: 1, pdfPages, blob: new Blob(['x']), addedAt: 'now' });
  }
  if (opts.index) await saveBookIndex(db, opts.index);
  return db;
}

describe('BookLink', () => {
  it('links to the page of a feature', async () => {
    const db = await setup({ index: index(book('tce', [entry('e', 35, ['feat:a'])])), books: [['tce', 20]] });
    renderWithProviders(<BookLink contentIds={['feat:a']} label="Sanctuary" />, db);
    const link = await screen.findByRole('link', { name: "Lees Sanctuary in Tasha's Cauldron of Everything, blz. 35" });
    expect(link.getAttribute('href')).toBe('#/books/tce/35');
    expect(link.textContent).toBe('In boek');
  });

  it('offers a choice when a feature is in two books', async () => {
    const db = await setup({
      index: index(book('xge', [entry('x', 12, ['feat:a'])]), book('tce', [entry('e', 35, ['feat:a'])])),
      books: [['tce', 20]],
    });
    const user = userEvent.setup();
    renderWithProviders(<BookLink contentIds={['feat:a']} label="A" />, db);
    await user.click(await screen.findByRole('button', { name: 'In boek' }));
    expect(screen.getByRole('link', { name: "Tasha's Cauldron of Everything blz. 35" }).getAttribute('href')).toBe('#/books/tce/35');
    expect(screen.getByRole('button', { name: "Xanathar's Guide to Everything blz. 12" })).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('link', { name: /blz. 35/ })).toBeNull();
  });

  it('says which book to add when it is missing', async () => {
    const db = await setup({ index: index(book('tce', [entry('e', 35, ['feat:a'])])) });
    const user = userEvent.setup();
    renderWithProviders(<BookLink contentIds={['feat:a']} label="A" />, db);
    await user.click(await screen.findByRole('button', { name: 'In boek' }));
    expect(screen.getByText("Voeg Tasha's Cauldron of Everything toe in Instellingen → Boeken")).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Instellingen' }));
    expect(window.location.hash).toBe('#/settings');
  });

  it('shows nothing without a known page', async () => {
    const db = await setup({ index: index(book('tce', [entry('e', 35, ['feat:a'])])), books: [['tce', 20]] });
    const { container } = renderWithProviders(<BookLink contentIds={['feat:other']} label="A" />, db);
    await new Promise((r) => setTimeout(r, 50));
    expect(container.querySelector('.book-link, .book-link-wrap')).toBeNull();
  });

  it('hides spots of a book whose pdf does not fit the index', async () => {
    const db = await setup({ index: index(book('tce', [entry('e', 35, ['feat:a'])], 20)), books: [['tce', 21]] });
    const { container } = renderWithProviders(<BookLink contentIds={['feat:a']} label="A" />, db);
    await new Promise((r) => setTimeout(r, 50));
    await waitFor(() => expect(container.querySelector('.book-link, .book-link-wrap')).toBeNull());
  });

  it('loads the index once for several links', async () => {
    const db = await setup({ index: index(book('tce', [entry('e', 35, ['feat:a', 'feat:b'])])), books: [['tce', 20]] });
    const spy = vi.spyOn(storage, 'loadBookIndex');
    renderWithProviders(
      <>
        <BookLink contentIds={['feat:a']} label="A" />
        <BookLink contentIds={['feat:b']} label="B" />
        <BookLink contentIds={['feat:a']} label="C" />
      </>,
      db,
    );
    expect(await screen.findAllByRole('link')).toHaveLength(3);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('reloads after BOOKS_CHANGED', async () => {
    const db = await setup({ index: index(book('tce', [entry('e', 35, ['feat:a'])])) });
    const user = userEvent.setup();
    renderWithProviders(<BookLink contentIds={['feat:a']} label="A" />, db);
    await user.click(await screen.findByRole('button', { name: 'In boek' }));
    await saveBook(db, { bookId: 'tce', name: 'tce.pdf', size: 1, pdfPages: 20, blob: new Blob(['x']), addedAt: 'now' });
    act(() => {
      window.dispatchEvent(new Event(BOOKS_CHANGED));
    });
    expect((await screen.findByRole('link', { name: /blz. 35/ })).getAttribute('href')).toBe('#/books/tce/35');
  });
});
