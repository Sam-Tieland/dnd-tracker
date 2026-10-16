import { describe, expect, it } from 'vitest';
import { createCharacter } from '../model/character';
import v1 from './fixtures/character-v1.json';
import { CHARACTER_SCHEMA_VERSION, MigrationError, migrateCharacter } from './migrations';

describe('migrateCharacter', () => {
  it('reads the frozen schema 1 fixture unchanged', () => {
    expect(migrateCharacter(v1)).toEqual(v1);
  });

  it('runs every migration from the stored version up to the current one', () => {
    const current = createCharacter({ id: 'c1', name: 'Kael', now: '2026-10-16T10:00:00.000Z' });
    const { name, ...rest } = current;
    const v0 = { ...rest, naam: name, schemaVersion: 0 };
    const migrations = { 0: ({ naam, ...raw }: Record<string, unknown>) => ({ ...raw, name: naam }) };
    expect(migrateCharacter(v0, migrations)).toEqual(current);
  });

  it.each([
    ['not an object', 'banana', 'invalid'],
    ['no schema version', { id: 'x' }, 'invalid'],
    ['a newer schema version', { ...createCharacter(), schemaVersion: CHARACTER_SCHEMA_VERSION + 1 }, 'newer-version'],
    ['a version without migration', { ...createCharacter(), schemaVersion: 0 }, 'invalid'],
    ['an invalid character', { ...createCharacter(), state: { ...createCharacter().state, exhaustion: 9 } }, 'invalid'],
  ])('rejects %s', (_name, raw, code) => {
    let caught: unknown;
    try {
      migrateCharacter(raw);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(MigrationError);
    expect((caught as MigrationError).code).toBe(code);
  });
});
