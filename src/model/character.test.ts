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

  it('rejects malformed timestamps', () => {
    expect(CharacterSchema.safeParse({ ...valid, createdAt: 'banana' }).success).toBe(false);
    expect(CharacterSchema.safeParse({ ...valid, updatedAt: '' }).success).toBe(false);
    expect(CharacterSchema.safeParse({ ...valid, notes: [{ id: 'n1', title: 't', body: 'b', updatedAt: 'banana' }] }).success).toBe(false);
  });

  it('accepts ISO timestamps from toISOString', () => {
    expect(CharacterSchema.safeParse({ ...valid, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).success).toBe(true);
  });

  it('validates the keys of hitDiceSpent and slotsUsed', () => {
    const withState = (state: object) => ({ ...valid, state: { ...valid.state, ...state } });
    expect(CharacterSchema.safeParse(withState({ slotsUsed: { '10': 1 } })).success).toBe(false);
    expect(CharacterSchema.safeParse(withState({ slotsUsed: { foo: 1 } })).success).toBe(false);
    expect(CharacterSchema.safeParse(withState({ slotsUsed: { d7: 1 } })).success).toBe(false);
    expect(CharacterSchema.safeParse(withState({ hitDiceSpent: { x: 1 } })).success).toBe(false);
    expect(CharacterSchema.safeParse(withState({ slotsUsed: { '1': 2 }, hitDiceSpent: { d10: 1 } })).success).toBe(true);
  });

  it('caps the number of levels at 20', () => {
    const level = { classId: 'srd:class:fighter', hp: 'average' as const, featureChoices: {} };
    const withLevels = (n: number) => ({ ...valid, choices: { ...valid.choices, levels: Array.from({ length: n }, () => level) } });
    expect(CharacterSchema.safeParse(withLevels(20)).success).toBe(true);
    expect(CharacterSchema.safeParse(withLevels(21)).success).toBe(false);
  });

  it('inventory and override ids fit bonus targets such as attack:<id>', () => {
    const withItem = (id: string) => ({ ...valid, inventory: [{ id, qty: 1, equipped: false, attuned: false }] });
    expect(CharacterSchema.safeParse(withItem('6f1d2c3b-0a4e-4b5f-8a6d-7e8f9a0b1c2d')).success).toBe(true);
    expect(CharacterSchema.safeParse(withItem('Item 1')).success).toBe(false);
    expect(CharacterSchema.safeParse({ ...valid, overrides: [{ id: 'O:1', target: 'ac', value: 1, reason: '' }] }).success).toBe(false);
  });

  it('a spell from a feat carries its own spellcasting ability', () => {
    const withSpell = (entry: object) => ({ ...valid, choices: { ...valid.choices, spells: [entry] } });
    const guidance = { classId: 'srd:class:cleric', spellId: 'srd:spell:guidance', prepared: true };
    expect(CharacterSchema.safeParse(withSpell({ ...guidance, ability: 'wis' })).success).toBe(true);
    expect(CharacterSchema.safeParse(withSpell({ ...guidance, ability: 'luck' })).success).toBe(false);
  });
});
