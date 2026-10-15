import { describe, expect, it } from 'vitest';
import { convertMagicItems, splitTopLevel } from './magic-items';
import { readVendor } from './vendor';

describe('convertMagicItems', () => {
  const items = convertMagicItems(readVendor('magic-items.md'));

  it('finds all 258 magic items with unique ids', () => {
    expect(items).toHaveLength(258);
    expect(new Set(items.map((i) => i.id)).size).toBe(258);
  });

  it('reads category, rarity and attunement', () => {
    const bag = items.find((i) => i.name === 'Bag of Holding')!;
    expect(bag).toMatchObject({ id: 'srd:magic-item:bag-of-holding', category: 'Wondrous Item', rarity: 'Uncommon', attunement: false });
    expect(bag.text).toContain('500 pounds');
    expect(items.some((i) => i.attunement)).toBe(true);
  });

  it('keeps stat blocks with the item that comes before them', () => {
    const figurine = items.find((i) => i.name === 'Figurine of Wondrous Power')!;
    expect(figurine.text).toContain('#### Giant Fly');
    expect(figurine.text).toContain('Silver Raven');
    // "Mysterious Deck" is the SRD 5.2.1 name of the Deck of Many Things.
    const deck = items.find((i) => i.name === 'Mysterious Deck')!;
    expect(deck.text).toContain('#### Avatar of Death');
    expect(items.some((i) => i.name === 'Giant Fly' || i.name === 'Avatar of Death')).toBe(false);
  });
});

describe('splitTopLevel', () => {
  it('ignores commas inside parentheses', () => {
    expect(splitTopLevel('Armor (Any Medium or Heavy, Except Hide Armor), Uncommon')).toEqual([
      'Armor (Any Medium or Heavy, Except Hide Armor)',
      'Uncommon',
    ]);
  });
});
