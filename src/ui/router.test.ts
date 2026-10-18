// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { backHrefFromBooks, hrefFor, parseHash, type Route } from './router';

/** jsdom fires hashchange in a later task. */
const goTo = async (hash: string) => {
  window.location.hash = hash;
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('router', () => {
  it.each<Route>([
    { name: 'list' },
    { name: 'new' },
    { name: 'settings' },
    { name: 'credits' },
    { name: 'sheet', id: '9b2f4c1e-0d3a' },
    { name: 'edit', id: '9b2f4c1e-0d3a' },
    { name: 'books' },
    { name: 'books', bookId: 'tce' },
    { name: 'books', bookId: 'tce', bookPage: 34 },
  ])('round-trips %o', (route) => {
    expect(parseHash(hrefFor(route))).toEqual(route);
  });

  it('reads the book routes', () => {
    expect(parseHash('#/books')).toEqual({ name: 'books' });
    expect(parseHash('#/books/tce')).toEqual({ name: 'books', bookId: 'tce' });
    expect(parseHash('#/books/tce/34')).toEqual({ name: 'books', bookId: 'tce', bookPage: 34 });
    expect(hrefFor({ name: 'books', bookId: 'phb-2024', bookPage: 7 })).toBe('#/books/phb-2024/7');
  });

  it('drops an unknown book or a page that is not a positive whole number', () => {
    expect(parseHash('#/books/onbekend')).toEqual({ name: 'books' });
    expect(parseHash('#/books/onbekend/3')).toEqual({ name: 'books' });
    expect(parseHash('#/books/tce/abc')).toEqual({ name: 'books', bookId: 'tce' });
    expect(parseHash('#/books/tce/0')).toEqual({ name: 'books', bookId: 'tce' });
    expect(parseHash('#/books/tce/-2')).toEqual({ name: 'books', bookId: 'tce' });
    expect(parseHash('#/books/tce/3.5')).toEqual({ name: 'books', bookId: 'tce' });
  });

  it('goes back from the books to where you came from', async () => {
    await goTo('#/c/abc');
    await goTo('#/books/tce');
    expect(backHrefFromBooks()).toBe('#/c/abc');
    await goTo('#/books/tce/34');
    expect(backHrefFromBooks()).toBe('#/c/abc');
    await goTo('#/settings');
    await goTo('#/books');
    expect(backHrefFromBooks()).toBe('#/settings');
  });

  it('sends unknown or empty hashes to the list', () => {
    expect(parseHash('')).toEqual({ name: 'list' });
    expect(parseHash('#/nowhere')).toEqual({ name: 'list' });
    expect(parseHash('#/c/')).toEqual({ name: 'list' });
  });

  it('sends a hash with a malformed escape to the list instead of throwing', () => {
    expect(parseHash('#/c/100%')).toEqual({ name: 'list' });
    expect(parseHash('#/c/%E0%A4%A')).toEqual({ name: 'list' });
    expect(parseHash('#/c/%E0%A4%A/edit')).toEqual({ name: 'list' });
  });
});
