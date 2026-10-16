import { describe, expect, it } from 'vitest';
import { requestPersistence } from './persist';

describe('requestPersistence', () => {
  it('reports what the browser answers, and false when it cannot ask', async () => {
    expect(await requestPersistence({ persist: async () => true })).toBe(true);
    expect(await requestPersistence({ persist: async () => false })).toBe(false);
    expect(await requestPersistence(undefined)).toBe(false);
    expect(await requestPersistence({})).toBe(false);
    expect(await requestPersistence({ persist: async () => { throw new Error('denied'); } })).toBe(false);
  });
});
