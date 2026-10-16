import { describe, expect, it } from 'vitest';
import { loadBuiltinContent } from './load';
import type { FeatureDef, SpellDef } from './schema';
import { userContentId, validateUserContent } from './user';

const spell: SpellDef = {
  id: 'user:spell:frost-whip', type: 'spell', source: 'user', name: 'Frost Whip', level: 0, school: 'Evocation',
  classes: ['srd:class:wizard'], castingTime: 'Action', ritual: false, range: '30 feet', components: 'V, S',
  duration: 'Instantaneous', concentration: false, text: 'A whip of frost.',
};
const fill: FeatureDef = {
  id: 'user:feature:abc', type: 'feature', source: 'user', fills: 'skeleton:feature:battle-master:3:feature',
  name: 'Combat Superiority', text: 'My notes', effects: [],
};

describe('validateUserContent', () => {
  it('accepts own items and fills of built-in features', () => {
    expect(validateUserContent([spell, fill])).toEqual({ items: [spell, fill], issues: [] });
  });

  it.each([
    ['a built-in source', { ...spell, source: 'srd' }, 'source must be "user"'],
    ['an id outside user:', { ...spell, id: 'srd:spell:fire-bolt' }, 'id must look like user:spell:<id>'],
    ['an id of another type', { ...spell, id: 'user:feat:frost-whip' }, 'id must look like user:spell:<id>'],
    ['a fill on a spell', { ...spell, fills: 'srd:spell:fire-bolt' }, 'a spell cannot fill another item'],
    ['a fill of an own item', { ...fill, fills: 'user:feature:other' }, 'fills must point at a built-in item'],
    ['an invalid shape', { ...spell, level: 12 }, 'level'],
  ])('rejects %s', (_name, item, message) => {
    const result = validateUserContent([item]);
    expect(result.items).toEqual([]);
    expect(result.issues[0].message).toContain(message);
  });

  it('rejects types that cannot be added as own content, such as a class', () => {
    const fighter = loadBuiltinContent().find((i) => i.id === 'srd:class:fighter')!;
    expect(validateUserContent([{ ...fighter, id: 'user:class:my-fighter', source: 'user' }]).issues[0].message).toBe(
      'type "class" cannot be added as own content',
    );
  });

  it('keeps the first of two items with the same id', () => {
    const result = validateUserContent([spell, { ...spell, name: 'Copy' }]);
    expect(result.items).toEqual([spell]);
    expect(result.issues).toEqual([{ index: 1, id: spell.id, message: 'duplicate id' }]);
  });

  it('makes ids that pass the gate', () => {
    expect(userContentId('magic-item', 'b1c2')).toBe('user:magic-item:b1c2');
    expect(validateUserContent([{ ...spell, id: userContentId('spell') }]).issues).toEqual([]);
  });
});
