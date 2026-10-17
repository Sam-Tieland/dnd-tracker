import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { SpellDef } from '../content/schema';
import { kael } from '../rules/testing/fixtures';
import { openDb } from './db';
import type { ParsedImport } from './export';
import { applyImport, planImport } from './import';

const freshDb = () => openDb(`test-${crypto.randomUUID()}`);
const NOW = '2026-10-17T10:00:00.000Z';
const spell: SpellDef = {
  id: 'user:spell:frost-whip', type: 'spell', source: 'user', name: 'Frost Whip', level: 0, school: 'Evocation',
  classes: ['srd:class:wizard'], castingTime: 'Action', ritual: false, range: '30 feet', components: 'V, S',
  duration: 'Instantaneous', concentration: false, text: 'A whip of frost.',
};
const parsed = (overrides: Partial<ParsedImport> = {}): ParsedImport => ({
  kind: 'backup', exportedAt: NOW, characters: [kael()], customContent: [spell], ...overrides,
});

describe('import storage', () => {
  it('plans which characters and content already exist', async () => {
    const db = freshDb();
    await db.characters.put(kael());
    await db.customContent.put(spell);
    const plan = await planImport(db, parsed({ characters: [kael(), { ...kael(), id: 'other' }], customContent: [spell, { ...spell, id: 'user:spell:new' }] }));
    expect(plan.characters.map((c) => [c.character.id, c.exists])).toEqual([['test', true], ['other', false]]);
    expect(plan.content.map((c) => [c.item.id, c.exists])).toEqual([['user:spell:frost-whip', true], ['user:spell:new', false]]);
  });

  it('adds new characters and content', async () => {
    const db = freshDb();
    const result = await applyImport(db, await planImport(db, parsed()), {}, NOW);
    expect(result).toEqual({ added: 1, replaced: 0, copied: 0, content: 1 });
    expect(await db.characters.get('test')).toEqual(kael());
    expect(await db.customContent.get(spell.id)).toEqual(spell);
  });

  it('copies by default', async () => {
    const db = freshDb();
    await db.characters.put({ ...kael(), name: 'Old' });
    const result = await applyImport(db, await planImport(db, parsed()), {}, NOW);
    expect(result).toEqual({ added: 0, replaced: 0, copied: 1, content: 1 });
    const rows = await db.characters.toArray();
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.id === 'test')?.name).toBe('Old');
    const copy = rows.find((r) => r.id !== 'test');
    expect(copy).toMatchObject({ name: kael().name, createdAt: NOW, updatedAt: NOW });
  });

  it('replaces when asked', async () => {
    const db = freshDb();
    await db.characters.put({ ...kael(), name: 'Old' });
    const result = await applyImport(db, await planImport(db, parsed()), { test: 'replace' }, NOW);
    expect(result).toEqual({ added: 0, replaced: 1, copied: 0, content: 1 });
    expect(await db.characters.toArray()).toEqual([kael()]);
  });

  it('replaces content with the same id', async () => {
    const db = freshDb();
    await applyImport(db, await planImport(db, parsed({ characters: [] })), {}, NOW);
    await applyImport(db, await planImport(db, parsed({ characters: [] })), {}, NOW);
    expect(await db.customContent.count()).toBe(1);
  });

  it('writes nothing when one item fails', async () => {
    const db = freshDb();
    const plan = await planImport(db, parsed({ characters: [kael(), { ...kael(), id: 'bad', state: { ...kael().state, exhaustion: 9 } }] }));
    await expect(applyImport(db, plan, {}, NOW)).rejects.toThrow();
    expect(await db.characters.count()).toBe(0);
    expect(await db.customContent.count()).toBe(0);
  });
});
