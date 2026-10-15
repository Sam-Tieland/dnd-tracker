import { describe, expect, it } from 'vitest';
import { CharacterSchema, createCharacter } from './character';

describe('createCharacter', () => {
  it('creates a valid empty character', () => {
    const character = createCharacter({ id: 'c1', name: 'Kael', now: '2026-10-15T10:00:00.000Z' });
    expect(CharacterSchema.parse(character)).toEqual(character);
    expect(character).toMatchObject({ id: 'c1', name: 'Kael', schemaVersion: 1, createdAt: '2026-10-15T10:00:00.000Z' });
    expect(character.choices.baseAbilities).toEqual({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
    expect(character.choices.levels).toEqual([]);
  });

  it('generates a new id each time', () => {
    expect(createCharacter().id).not.toBe(createCharacter().id);
  });
});

describe('CharacterSchema', () => {
  const valid = createCharacter({ id: 'c1' });

  it('accepts a filled character', () => {
    const filled = {
      ...valid,
      choices: {
        ...valid.choices,
        levels: [{ classId: 'srd:class:fighter', hp: 'average', featId: 'srd:feat:defense', featureChoices: {} }, { classId: 'srd:class:fighter', hp: 7, asi: { str: 2 }, featureChoices: {} }],
      },
      inventory: [{ id: 'i1', itemId: 'srd:armor:chain-mail', qty: 1, equipped: true, attuned: false }],
      overrides: [{ id: 'o1', target: 'ac', value: 1, reason: 'Ring of Protection' }],
    };
    expect(CharacterSchema.safeParse(filled).success).toBe(true);
  });

  it('rejects invalid values', () => {
    const level = (hp: unknown) => ({ ...valid, choices: { ...valid.choices, levels: [{ classId: 'srd:class:fighter', hp, featureChoices: {} }] } });
    expect(CharacterSchema.safeParse(level('max')).success).toBe(false);
    expect(CharacterSchema.safeParse(level(0)).success).toBe(false);
    expect(CharacterSchema.safeParse({ ...valid, state: { ...valid.state, exhaustion: 7 } }).success).toBe(false);
    expect(CharacterSchema.safeParse({ ...valid, overrides: [{ id: 'o1', target: 'armor', value: 1, reason: '' }] }).success).toBe(false);
    expect(CharacterSchema.safeParse({ ...valid, unknown: true }).success).toBe(false);
  });
});
