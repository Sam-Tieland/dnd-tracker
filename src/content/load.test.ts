import { describe, expect, it } from 'vitest';
import { loadBuiltinContent } from './load';
import { createRegistry } from './registry';
import { ContentItemSchema, type ContentType } from './schema';

const items = loadBuiltinContent();
const registry = createRegistry(items);

describe('built-in content', () => {
  it('is valid and has unique ids', () => {
    for (const item of items) {
      const result = ContentItemSchema.safeParse(item);
      expect(result.success, item.id).toBe(true);
    }
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });

  it('has four subclasses per class: one SRD and three skeletons', () => {
    expect(registry.list('subclass')).toHaveLength(48);
    for (const cls of registry.list('class')) {
      const subs = registry.list('subclass').filter((s) => s.classId === cls.id);
      expect(subs.map((s) => s.source).sort(), cls.name).toEqual(['skeleton', 'skeleton', 'skeleton', 'srd']);
    }
  });

  it('resolves every reference', () => {
    const missing: string[] = [];
    const check = (type: ContentType, id: string | undefined) => {
      if (id && !registry.getOf(type, id)) missing.push(`${type} ${id}`);
    };
    for (const cls of registry.list('class')) cls.levels.forEach((l) => l.featureIds.forEach((id) => check('feature', id)));
    for (const sub of registry.list('subclass')) {
      check('class', sub.classId);
      sub.features.forEach((f) => check('feature', f.featureId));
    }
    for (const species of registry.list('species')) species.traitIds.forEach((id) => check('feature', id));
    for (const background of registry.list('background')) check('feat', background.featId);
    for (const spell of registry.list('spell')) spell.classes.forEach((id) => check('class', id));
    expect(missing).toEqual([]);
  });

  it('applies class mechanics and effects', () => {
    expect(registry.getOf('class', 'srd:class:wizard')!.spellcasting).toEqual({ ability: 'int', progression: 'full' });
    expect(registry.getOf('feature', 'srd:feature:barbarian:1:rage')!.effects[0]).toMatchObject({ kind: 'resource', key: 'rage' });
    expect(registry.getOf('feat', 'srd:feat:alert')!.effects).toHaveLength(1);
  });

  it('gives skeleton subclasses empty features at the class subclass levels', () => {
    const ek = registry.getOf('subclass', 'skeleton:subclass:eldritch-knight')!;
    expect(ek.features.map((f) => f.level)).toEqual([3, 7, 10, 15, 18]);
    expect(registry.getOf('feature', ek.features[0].featureId)).toMatchObject({ name: '', text: '', source: 'skeleton' });
    expect(registry.getOf('feature', ek.features[0].featureId)!.effects).toEqual([
      { kind: 'spellcasting', classId: 'srd:class:fighter', ability: 'int', progression: 'third' },
    ]);
    expect(registry.getOf('feature', ek.features[1].featureId)!.effects).toEqual([]);
    expect(registry.getOf('subclass', 'skeleton:subclass:arcane-trickster')!.features.map((f) => f.level)).toEqual([3, 9, 13, 17]);
  });
});
