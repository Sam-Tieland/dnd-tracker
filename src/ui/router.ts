import { useSyncExternalStore } from 'react';
import { BOOK_IDS, type BookId } from '../content/books';

export type Route =
  | { name: 'list' }
  | { name: 'new' }
  | { name: 'settings' }
  | { name: 'credits' }
  | { name: 'sheet'; id: string }
  | { name: 'edit'; id: string }
  | { name: 'books'; bookId?: BookId; bookPage?: number };

function parseBooks(bookId: string | undefined, bookPage: string | undefined): Route {
  if (!(BOOK_IDS as readonly (string | undefined)[]).includes(bookId)) return { name: 'books' };
  const page = bookPage !== undefined && /^\d+$/.test(bookPage) ? Number(bookPage) : 0;
  return page > 0 ? { name: 'books', bookId: bookId as BookId, bookPage: page } : { name: 'books', bookId: bookId as BookId };
}

/**
 * Hash routes work on GitHub Pages without a 404 page: #/, #/new, #/settings, #/credits, #/c/<id>, #/c/<id>/edit,
 * #/books, #/books/<bookId> and #/books/<bookId>/<bookPage>.
 */
export function parseHash(hash: string): Route {
  let parts: string[];
  try {
    parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    // A malformed escape such as "%" or "%E0%A4%A" (typed or pasted by hand) is just an unknown address.
    return { name: 'list' };
  }
  if (parts[0] === 'new') return { name: 'new' };
  if (parts[0] === 'settings') return { name: 'settings' };
  if (parts[0] === 'credits') return { name: 'credits' };
  if (parts[0] === 'books') return parseBooks(parts[1], parts[2]);
  if (parts[0] === 'c' && parts[1]) return parts[2] === 'edit' ? { name: 'edit', id: parts[1] } : { name: 'sheet', id: parts[1] };
  return { name: 'list' };
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case 'list':
      return '#/';
    case 'new':
      return '#/new';
    case 'settings':
      return '#/settings';
    case 'credits':
      return '#/credits';
    case 'sheet':
      return `#/c/${encodeURIComponent(route.id)}`;
    case 'edit':
      return `#/c/${encodeURIComponent(route.id)}/edit`;
    case 'books':
      if (route.bookId === undefined) return '#/books';
      return route.bookPage === undefined ? `#/books/${route.bookId}` : `#/books/${route.bookId}/${route.bookPage}`;
  }
}

const isBooksHash = (hash: string) => parseHash(hash).name === 'books';

/** The last address outside the books, so "Back" in the reader returns there however much you jumped around inside. */
let lastOutsideBooks = '#/';
if (typeof window !== 'undefined') {
  if (!isBooksHash(window.location.hash)) lastOutsideBooks = window.location.hash || '#/';
  window.addEventListener('hashchange', (event) => {
    const hash = new URL(event.newURL).hash;
    if (!isBooksHash(hash)) lastOutsideBooks = hash || '#/';
  });
}

export function backHrefFromBooks(): string {
  return lastOutsideBooks;
}

export function navigate(route: Route): void {
  window.location.hash = hrefFor(route);
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
};

export function useRoute(): Route {
  return parseHash(useSyncExternalStore(subscribe, () => window.location.hash));
}
