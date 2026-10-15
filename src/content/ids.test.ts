import { describe, expect, it } from 'vitest';
import { contentId, slugify } from './ids';

describe('slugify', () => {
  it.each([
    ["Monk's Focus", 'monks-focus'],
    ['Lay On Hands', 'lay-on-hands'],
    ['Path of the Berserker', 'path-of-the-berserker'],
    ['Mystic Arcanum (level 6 spell)', 'mystic-arcanum-level-6-spell'],
    ['  Sleight of Hand ', 'sleight-of-hand'],
    ['Dark One’s Own Luck', 'dark-ones-own-luck'],
    ['Bottle, Glass', 'bottle-glass'],
  ])('%s -> %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('contentId', () => {
  it('joins source, type and slugged parts', () => {
    expect(contentId('srd', 'class', 'Barbarian')).toBe('srd:class:barbarian');
    expect(contentId('srd', 'feature', 'barbarian', 1, 'Rage')).toBe('srd:feature:barbarian:1:rage');
    expect(contentId('skeleton', 'subclass', 'Battle Master')).toBe('skeleton:subclass:battle-master');
  });
});
