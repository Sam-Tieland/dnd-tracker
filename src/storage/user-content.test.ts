import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { SpellDef } from '../content/schema';
import { openDb } from './db';
import { loadUserContent } from './user-content';

const spell: SpellDef = {
  id: 'user:spell:frost-whip', type: 'spell', source: 'user', name: 'Frost Whip', level: 0, school: 'Evocation',
  classes: ['srd:class:wizard'], castingTime: 'Action', ritual: false, range: '30 feet', components: 'V, S',
  duration: 'Instantaneous', concentration: false, text: 'A whip of frost.',
};

describe('loadUserContent', () => {
  it('returns valid own content and reports the rest without deleting it', async () => {
    const db = openDb(`test-${crypto.randomUUID()}`);
    await db.customContent.bulkPut([spell, { ...spell, id: 'srd:spell:sneaky', source: 'srd' }]);
    const result = await loadUserContent(db);
    expect(result.items).toEqual([spell]);
    expect(result.issues.map((i) => i.id)).toEqual(['srd:spell:sneaky']);
    expect(await db.customContent.count()).toBe(2);
  });
});
