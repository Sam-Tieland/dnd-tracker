import 'fake-indexeddb/auto';
import { cleanup, render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach } from 'vitest';
import { openDb, type TrackerDb } from '../../storage/db';
import { App, Providers } from '../App';

/** jsdom has no matchMedia; tests set the answer per query (default: nothing matches). */
export function setMatchMedia(matches: (query: string) => boolean): void {
  window.matchMedia = (query: string) =>
    ({
      matches: matches(query),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

setMatchMedia(() => false);

afterEach(() => {
  cleanup();
  window.location.hash = '';
  document.documentElement.removeAttribute('data-theme');
  setMatchMedia(() => false);
});

export const testDb = (): TrackerDb => openDb(`test-${crypto.randomUUID()}`);

export function renderWithProviders(ui: ReactElement, db: TrackerDb = testDb()) {
  return { db, ...render(<Providers db={db}>{ui}</Providers>) };
}

export function renderApp(hash: string, db: TrackerDb = testDb()) {
  window.location.hash = hash;
  return { db, ...render(<App db={db} />) };
}
