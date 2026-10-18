import { describe, expect, it } from 'vitest';
import { CharacterSchema, createCharacter } from '../model/character';
import v1 from './fixtures/character-v1.json';
import { CHARACTER_SCHEMA_VERSION, MigrationError, migrateCharacter } from './migrations';

describe('migrateCharacter', () => {
  it('migrates the version 1 fixture to the current version unchanged apart from the version', () => {
    expect(migrateCharacter(v1)).toEqual({ ...v1, schemaVersion: 3 });
  });

  it('keeps the sheet details and pictures of schema 3', () => {
    const character = createCharacter({ id: 'c1', name: 'Kael' });
    const portrait = 'data:image/jpeg;base64,/9j/4AAQ';
    const detailed = { ...character, details: { playerName: 'Sam', xp: '300', ideals: 'Order', allies: 'The Guard', portrait } };
    expect(migrateCharacter(detailed).details).toEqual(detailed.details);
  });

  it('rejects a picture that is not a small png or jpeg', () => {
    const character = createCharacter({ id: 'c1', name: 'Kael' });
    expect(() => migrateCharacter({ ...character, details: { portrait: 'https://example.com/a.png' } })).toThrow(MigrationError);
    expect(() => migrateCharacter({ ...character, details: { portrait: `data:image/png;base64,${'A'.repeat(400_000)}` } })).toThrow(MigrationError);
  });

  it('keeps a level note', () => {
    const character = createCharacter({ id: 'c1', name: 'Kael' });
    const noted = {
      ...character,
      choices: { ...character.choices, levels: [{ classId: 'srd:class:fighter', hp: 'average' as const, featureChoices: {}, note: 'Riposte, Parry' }] },
    };
    expect(migrateCharacter(noted).choices.levels[0].note).toBe('Riposte, Parry');
    expect(CharacterSchema.parse(noted).choices.levels[0].note).toBe('Riposte, Parry');
  });

  it('runs every migration from the stored version up to the current one', () => {
    const current = createCharacter({ id: 'c1', name: 'Kael', now: '2026-10-16T10:00:00.000Z' });
    const { name, ...rest } = current;
    const v0 = { ...rest, naam: name, schemaVersion: 0 };
    const migrations = { 0: ({ naam, ...raw }: Record<string, unknown>) => ({ ...raw, name: naam }), 1: (raw: Record<string, unknown>) => raw, 2: (raw: Record<string, unknown>) => raw };
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
