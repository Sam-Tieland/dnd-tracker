import { describe, expect, it } from 'vitest';
import { createRegistry, mergeFill } from './registry';
import type { ContentItem, FeatureDef, SubclassDef } from './schema';

const skeletonFeature: FeatureDef = { id: 'skeleton:feature:battle-master:3:feature', type: 'feature', source: 'skeleton', name: '', text: '', effects: [] };
const fill: FeatureDef = {
  id: 'user:feature:abc', type: 'feature', source: 'user', fills: skeletonFeature.id, name: 'Combat Superiority', text: 'My notes',
  effects: [{ kind: 'resource', key: 'superiority-dice', name: 'Superiority Dice', max: 4, recharge: 'short' }],
};

describe('createRegistry', () => {
  it('merges a fill into its target and keeps the target id and source', () => {
    const registry = createRegistry([skeletonFeature], [fill]);
    expect(registry.get(skeletonFeature.id)).toMatchObject({ id: skeletonFeature.id, source: 'skeleton', name: 'Combat Superiority', text: 'My notes' });
    expect(registry.get('user:feature:abc')).toBeUndefined();
    expect(registry.getOf('feature', skeletonFeature.id)!.effects).toHaveLength(1);
  });

  it('adds user items without a valid target as standalone items', () => {
    const orphan: ContentItem = { ...fill, id: 'user:feature:def', fills: 'skeleton:feature:missing' };
    const registry = createRegistry([skeletonFeature], [orphan]);
    expect(registry.get('user:feature:def')).toMatchObject({ name: 'Combat Superiority' });
    expect(registry.get(skeletonFeature.id)).toMatchObject({ name: '' });
  });

  it('keeps a user item of another type than its target as a standalone item', () => {
    const wrongType: ContentItem = {
      id: 'user:feat:xyz', type: 'feat', source: 'user', fills: skeletonFeature.id, name: 'Mismatched Feat',
      category: 'general', repeatable: false, text: 'Not a feature', effects: [],
    };
    const registry = createRegistry([skeletonFeature], [wrongType]);
    expect(registry.getOf('feat', 'user:feat:xyz')).toMatchObject({ id: 'user:feat:xyz', source: 'user', name: 'Mismatched Feat' });
    expect(registry.get(skeletonFeature.id)).toEqual(skeletonFeature);
    expect(registry.get(skeletonFeature.id)).toMatchObject({ name: '', source: 'skeleton' });
    expect(registry.list('feature')).toHaveLength(1);
  });

  it('filters by type', () => {
    const registry = createRegistry([skeletonFeature]);
    expect(registry.getOf('spell', skeletonFeature.id)).toBeUndefined();
    expect(registry.list('feature')).toHaveLength(1);
    expect(registry.list('spell')).toEqual([]);
  });
});

describe('mergeFill', () => {
  const ekFeature: FeatureDef = {
    id: 'skeleton:feature:eldritch-knight:3:feature', type: 'feature', source: 'skeleton', name: '', text: '',
    effects: [{ kind: 'spellcasting', classId: 'srd:class:fighter', ability: 'int', progression: 'third' }],
  };
  const resource = { kind: 'resource', key: 'war-bond', name: 'War Bond', max: 1, recharge: 'long' } as const;

  it('keeps the target effects and adds those of the fill (Eldritch Knight keeps its spellcasting)', () => {
    const ekFill: FeatureDef = { id: 'user:feature:ek', type: 'feature', source: 'user', fills: ekFeature.id, name: 'Spellcasting', text: 'Notes', effects: [resource] };
    expect(createRegistry([ekFeature], [ekFill]).getOf('feature', ekFeature.id)!.effects).toEqual([...ekFeature.effects, resource]);
  });

  it('keeps name and text the fill leaves empty, and counts an effect the target already has once', () => {
    const target: FeatureDef = { ...ekFeature, name: 'Old', text: 'Old text' };
    const merged = mergeFill(target, { ...ekFeature, id: 'user:feature:x', source: 'user', name: '', text: '' });
    expect(merged).toMatchObject({ id: ekFeature.id, source: 'skeleton', name: 'Old', text: 'Old text' });
    expect((merged as FeatureDef).effects).toEqual(ekFeature.effects);
  });

  it('a subclass fill adds features after the built-in ones and never moves the subclass to another class', () => {
    const sub: SubclassDef = {
      id: 'skeleton:subclass:battle-master', type: 'subclass', source: 'skeleton', name: 'Battle Master', classId: 'srd:class:fighter',
      text: '', features: [{ level: 3, featureId: 'skeleton:feature:battle-master:3:feature' }],
    };
    const subFill: SubclassDef = {
      ...sub, id: 'user:subclass:bm', source: 'user', fills: sub.id, name: '', classId: 'srd:class:wizard',
      text: 'Masters of maneuvers.', features: [{ level: 3, featureId: 'user:feature:student-of-war' }],
    };
    const merged = mergeFill(sub, subFill) as SubclassDef;
    expect(merged.features.map((f) => f.featureId)).toEqual(['skeleton:feature:battle-master:3:feature', 'user:feature:student-of-war']);
    expect(merged).toMatchObject({ name: 'Battle Master', classId: 'srd:class:fighter', text: 'Masters of maneuvers.' });
  });
});
