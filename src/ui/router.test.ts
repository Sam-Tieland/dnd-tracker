import { describe, expect, it } from 'vitest';
import { hrefFor, parseHash, type Route } from './router';

describe('router', () => {
  it.each<Route>([
    { name: 'list' },
    { name: 'new' },
    { name: 'settings' },
    { name: 'credits' },
    { name: 'sheet', id: '9b2f4c1e-0d3a' },
    { name: 'edit', id: '9b2f4c1e-0d3a' },
  ])('round-trips %o', (route) => {
    expect(parseHash(hrefFor(route))).toEqual(route);
  });

  it('sends unknown or empty hashes to the list', () => {
    expect(parseHash('')).toEqual({ name: 'list' });
    expect(parseHash('#/nowhere')).toEqual({ name: 'list' });
    expect(parseHash('#/c/')).toEqual({ name: 'list' });
  });
});
