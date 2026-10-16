import { describe, expect, it } from 'vitest';
import { loadBuiltinContent } from '../content/load';
import { createRegistry } from '../content/registry';
import type { ContentItem, FeatureDef, SpellDef, SubclassDef } from '../content/schema';
import { level, makeCharacter } from '../rules/testing/fixtures';
import { directContentIds, usedUserContent } from './used-content';

const fillFeature: FeatureDef = {
  id: 'user:feature:combat-superiority', type: 'feature', source: 'user', fills: 'skeleton:feature:battle-master:3:feature',
  name: 'Combat Superiority', text: '', effects: [],
};
const extraFeature: FeatureDef = { id: 'user:feature:student-of-war', type: 'feature', source: 'user', name: 'Student of War', text: '', effects: [] };
const subclassFill: SubclassDef = {
  id: 'user:subclass:battle-master', type: 'subclass', source: 'user', fills: 'skeleton:subclass:battle-master', name: '',
  classId: 'srd:class:fighter', text: '', features: [{ level: 3, featureId: extraFeature.id }],
};
const ownSpell: SpellDef = {
  id: 'user:spell:frost-whip', type: 'spell', source: 'user', name: 'Frost Whip', level: 0, school: 'Evocation',
  classes: ['srd:class:wizard'], castingTime: 'Action', ritual: false, range: '30 feet', components: 'V, S',
  duration: 'Instantaneous', concentration: false, text: 'A whip of frost.',
};
const unusedSpell: SpellDef = { ...ownSpell, id: 'user:spell:unused', name: 'Unused' };
const userItems: ContentItem[] = [fillFeature, extraFeature, subclassFill, ownSpell, unusedSpell];
const registry = createRegistry(loadBuiltinContent(), userItems);

describe('usedUserContent', () => {
  const character = makeCharacter({
    choices: {
      levels: [level('fighter'), level('fighter'), level('fighter', { subclassId: 'skeleton:subclass:battle-master' })],
      spells: [{ classId: 'srd:class:wizard', spellId: ownSpell.id, prepared: true }],
    },
  });

  it('lists the ids a character points at directly', () => {
    expect(directContentIds(character)).toEqual(expect.arrayContaining(['srd:class:fighter', 'skeleton:subclass:battle-master', ownSpell.id]));
  });

  it('finds the own items a character reaches, also through fills of its skeleton subclass', () => {
    expect(usedUserContent(character, registry, userItems).map((i) => i.id)).toEqual([fillFeature.id, extraFeature.id, subclassFill.id, ownSpell.id]);
  });

  it('finds nothing for a character with only SRD content', () => {
    expect(usedUserContent(makeCharacter({ choices: { levels: [level('wizard')] } }), registry, userItems)).toEqual([]);
  });
});
