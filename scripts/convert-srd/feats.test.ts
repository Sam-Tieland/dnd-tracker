import { describe, expect, it } from 'vitest';
import { convertFeats } from './feats';
import { readVendor } from './vendor';

describe('convertFeats', () => {
  const feats = convertFeats(readVendor('feats.md'));
  const feat = (id: string) => feats.find((f) => f.id === id)!;

  it('finds all 17 feats by category', () => {
    expect(feats).toHaveLength(17);
    const count = (category: string) => feats.filter((f) => f.category === category).length;
    expect([count('origin'), count('general'), count('fighting-style'), count('epic-boon')]).toEqual([4, 2, 4, 7]);
  });

  it('reads prerequisites and repeatable', () => {
    expect(feat('srd:feat:ability-score-improvement').prerequisite).toBe('Level 4+');
    expect(feat('srd:feat:alert')).toMatchObject({ category: 'origin', prerequisite: undefined, repeatable: false });
    expect(feat('srd:feat:skilled').repeatable).toBe(true);
    expect(feat('srd:feat:defense').text).toContain('+1 bonus to Armor Class');
  });
});
