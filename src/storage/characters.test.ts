import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { kael } from '../rules/testing/fixtures';
import { deleteCharacter, loadCharacter, loadCharacters, saveCharacter } from './characters';
import { openDb } from './db';

const freshDb = () => openDb(`test-${crypto.randomUUID()}`);

describe('character storage', () => {
  it('saves and loads a character unchanged', async () => {
    const db = freshDb();
    await saveCharacter(db, kael());
    expect(await loadCharacter(db, 'test')).toEqual(kael());
    expect(await loadCharacter(db, 'nobody')).toBeUndefined();
  });

  it('lists the most recently changed character first', async () => {
    const db = freshDb();
    await saveCharacter(db, { ...kael(), id: 'old', updatedAt: '2026-10-01T00:00:00.000Z' });
    await saveCharacter(db, { ...kael(), id: 'new', updatedAt: '2026-10-10T00:00:00.000Z' });
    expect((await loadCharacters(db)).characters.map((c) => c.id)).toEqual(['new', 'old']);
  });

  it('never writes an invalid character', async () => {
    const db = freshDb();
    await expect(saveCharacter(db, { ...kael(), state: { ...kael().state, exhaustion: 9 } })).rejects.toThrow();
    expect(await db.characters.count()).toBe(0);
  });

  it('lists rows it cannot read as broken instead of failing', async () => {
    const db = freshDb();
    await saveCharacter(db, kael());
    await db.characters.put({ id: 'future', name: 'From the future', schemaVersion: 99 });
    await db.characters.put({ id: 'garbage', name: 42 });
    const loaded = await loadCharacters(db);
    expect(loaded.characters.map((c) => c.id)).toEqual(['test']);
    expect(loaded.broken.map((b) => [b.id, b.name])).toEqual([['future', 'From the future'], ['garbage', '']]);
  });

  it('deletes a character', async () => {
    const db = freshDb();
    await saveCharacter(db, kael());
    await deleteCharacter(db, 'test');
    expect((await loadCharacters(db)).characters).toEqual([]);
  });
});
