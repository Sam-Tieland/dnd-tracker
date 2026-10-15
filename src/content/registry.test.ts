import { describe, expect, it } from 'vitest';
import { createRegistry } from './registry';
import type { ContentItem, FeatureDef } from './schema';

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

  it('filters by type', () => {
    const registry = createRegistry([skeletonFeature]);
    expect(registry.getOf('spell', skeletonFeature.id)).toBeUndefined();
    expect(registry.list('feature')).toHaveLength(1);
    expect(registry.list('spell')).toEqual([]);
  });
});
