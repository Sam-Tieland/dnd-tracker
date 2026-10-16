import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'list' }
  | { name: 'new' }
  | { name: 'settings' }
  | { name: 'credits' }
  | { name: 'sheet'; id: string }
  | { name: 'edit'; id: string };

/** Hash routes work on GitHub Pages without a 404 page: #/, #/new, #/settings, #/credits, #/c/<id>, #/c/<id>/edit. */
export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'new') return { name: 'new' };
  if (parts[0] === 'settings') return { name: 'settings' };
  if (parts[0] === 'credits') return { name: 'credits' };
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
  }
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
