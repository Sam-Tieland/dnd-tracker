import { describe, expect, it } from 'vitest';
import { loadBuiltinContent } from '../../src/content/load';
import { createRegistry } from '../../src/content/registry';
import { validateUserContent } from '../../src/content/user';
import { deriveSheet } from '../../src/rules/derive';
import { kael } from '../../src/rules/testing/fixtures';
import { parseBookFile, parseUsage, toUserContent, type BookSubclass } from './convert';

const registry = createRegistry(loadBuiltinContent());

const file = (front: string, body: string) => `---\ntype: subclass\n${front}\npagina: 1\n---\n\n${body}`;

const battleMaster = file(
  'class: Fighter\nsubclass: Battle Master\nbron: PHB 2024\nregels: 2024',
  [
    '# Battle Master',
    '',
    'A made-up description.',
    '',
    '## Level 3: Combat Superiority',
    '',
    'Gebruik: 4 per Short Rest',
    '',
    'You have **four** dice.',
    '',
    '## Level 3: Student of War',
    '',
    'Made-up text.',
    '',
    '## Level 7: Know Your Enemy',
    '',
    'Gebruik: 1 per Long Rest',
    '',
    'Made-up text.',
    '',
    '## Notities',
    '',
    'Private note.',
  ].join('\n'),
);

describe('parseUsage', () => {
  it('reads a number, an ability modifier and the proficiency bonus', () => {
    expect(parseUsage('Gebruik: 4 per Short Rest')).toEqual({ max: 4, recharge: 'short' });
    expect(parseUsage('Gebruik: Wisdom modifier (min 1) per Long Rest')).toEqual({ max: { mod: 'wis', min: 1 }, recharge: 'long' });
    expect(parseUsage('Gebruik: Charisma modifier per Long Rest')).toEqual({ max: { mod: 'cha' }, recharge: 'long' });
    expect(parseUsage('Gebruik: Proficiency Bonus per Long Rest')).toEqual({ max: { pb: true }, recharge: 'long' });
  });

  it('leaves anything else alone', () => {
    expect(parseUsage('Gebruik: twice per day')).toBeUndefined();
    expect(parseUsage('Gebruik: Luck modifier per Long Rest')).toBeUndefined();
  });
});

describe('parseBookFile', () => {
  it('reads the header, the description and the features, without the notes', () => {
    const { subclass, warnings } = parseBookFile('fighter-battle-master.md', battleMaster);
    expect(warnings).toEqual([]);
    expect(subclass).toMatchObject({ className: 'Fighter', subclass: 'Battle Master', source: 'PHB 2024', description: 'A made-up description.' });
    expect(subclass?.features.map((f) => [f.level, f.name, f.usage])).toEqual([
      [3, 'Combat Superiority', { max: 4, recharge: 'short' }],
      [3, 'Student of War', undefined],
      [7, 'Know Your Enemy', { max: 1, recharge: 'long' }],
    ]);
    expect(subclass?.features[0].text).toBe('You have **four** dice.');
    expect(JSON.stringify(subclass)).not.toContain('Private note');
  });

  it('uses the 2024 level of an older feature', () => {
    const md = file("class: Cleric\nsubclass: Test Domain\nbron: Tasha's\nregels: 2014", '# Test Domain\n\nX.\n\n## Level 3 (was 1): Test Gift\n\nY.');
    expect(parseBookFile('cleric-test-domain.md', md).subclass?.features[0]).toMatchObject({ level: 3, name: 'Test Gift' });
  });

  it('keeps an unknown usage line in the text and warns', () => {
    const md = file('class: Fighter\nsubclass: Battle Master\nbron: PHB 2024\nregels: 2024', '# B\n\nX.\n\n## Level 3: A\n\nGebruik: twice per day\n\nText.');
    const { subclass, warnings } = parseBookFile('x.md', md);
    expect(subclass?.features[0].text).toBe('Gebruik: twice per day\n\nText.');
    expect(warnings).toHaveLength(1);
  });

  it('rejects a file without a header', () => {
    expect(parseBookFile('x.md', '# Nothing').subclass).toBeUndefined();
  });
});

describe('toUserContent', () => {
  const parsed = (md: string, name = 'f.md') => parseBookFile(name, md).subclass as BookSubclass;

  it('fills a skeleton subclass: one feature per skeleton level, extra features added, all valid own content', () => {
    const result = toUserContent([parsed(battleMaster)], registry);
    expect(result.filled).toEqual(['Fighter: Battle Master']);
    expect(validateUserContent(result.items).issues).toEqual([]);
    const user = createRegistry(loadBuiltinContent(), result.items);
    const sub = user.getOf('subclass', 'skeleton:subclass:battle-master');
    const names = sub?.features.map((f) => [f.level, user.getOf('feature', f.featureId)?.name]);
    expect(names).toContainEqual([3, 'Combat Superiority']);
    expect(names).toContainEqual([3, 'Student of War']);
    expect(names).toContainEqual([7, 'Know Your Enemy']);
    expect(sub?.text).toBe('A made-up description.');
    const combat = sub?.features.map((f) => user.getOf('feature', f.featureId)).find((f) => f?.name === 'Combat Superiority');
    expect(combat?.effects).toEqual([{ kind: 'resource', key: 'fighter-battle-master-3-combat-superiority', name: 'Combat Superiority', max: 4, recharge: 'short' }]);
  });

  it('skips an SRD subclass, which is complete already', () => {
    const md = file('class: Fighter\nsubclass: Champion\nbron: PHB 2024\nregels: 2024', '# Champion\n\nX.\n\n## Level 3: Improved Critical\n\nY.');
    const result = toUserContent([parsed(md)], registry);
    expect(result.skipped).toEqual(['Fighter: Champion']);
    expect(result.items).toEqual([]);
  });

  it('adds a subclass from another book under its own name', () => {
    const md = file("class: Cleric\nsubclass: Test Domain\nbron: Tasha's\nregels: 2014", '# Test Domain\n\nX.\n\n## Level 3 (was 1): Test Gift\n\nY.\n\n## Level 6: Test Step\n\nZ.');
    const result = toUserContent([parsed(md)], registry);
    expect(result.added).toEqual(["Cleric: Test Domain (Tasha's)"]);
    expect(validateUserContent(result.items).issues).toEqual([]);
    const user = createRegistry(loadBuiltinContent(), result.items);
    const sub = user.list('subclass').find((s) => s.name === "Test Domain (Tasha's)");
    expect(sub?.classId).toBe('srd:class:cleric');
    expect(sub?.features.map((f) => [f.level, user.getOf('feature', f.featureId)?.name])).toEqual([
      [3, 'Test Gift'],
      [6, 'Test Step'],
    ]);
  });

  it('gives the same ids every time, so a new import replaces the old one', () => {
    const a = toUserContent([parsed(battleMaster)], registry).items.map((i) => i.id);
    const b = toUserContent([parsed(battleMaster)], registry).items.map((i) => i.id);
    expect(a).toEqual(b);
  });

  it('replaces a renamed feature on a re-import instead of keeping both', () => {
    const first = toUserContent([parsed(battleMaster)], registry).items;
    const renamed = toUserContent([parsed(battleMaster.replace('Combat Superiority', 'Superiority Dice'))], registry).items;
    // The database keeps one row per id; a re-import overwrites rows with the same id.
    const stored = new Map([...first, ...renamed].map((item) => [item.id, item]));
    const user = createRegistry(loadBuiltinContent(), [...stored.values()]);
    const slot = user.getOf('feature', 'skeleton:feature:battle-master:3:feature');
    expect(slot?.name).toBe('Superiority Dice');
    expect(slot?.effects.filter((e) => e.kind === 'resource')).toHaveLength(1);
  });

  it('gives same-named features on different levels their own resource', () => {
    const md = file(
      "class: Cleric\nsubclass: Test Domain\nbron: Tasha's\nregels: 2014",
      '# T\n\nX.\n\n## Level 3: Test Haven\n\nGebruik: 1 per Long Rest\n\nA.\n\n## Level 17: Test Haven\n\nGebruik: 2 per Long Rest\n\nB.',
    );
    const keys = toUserContent([parsed(md)], registry).items.flatMap((i) => ('effects' in i ? i.effects : [])).map((e) => (e.kind === 'resource' ? e.key : ''));
    expect(new Set(keys).size).toBe(2);
  });

  it('puts the resource of a filled skeleton level on the sheet', () => {
    const user = createRegistry(loadBuiltinContent(), toUserContent([parsed(battleMaster)], registry).items);
    const character = kael();
    character.choices.levels = character.choices.levels.map((l) => (l.subclassId ? { ...l, subclassId: 'skeleton:subclass:battle-master' } : l));
    const resource = deriveSheet(character, user).resources.find((r) => r.name === 'Combat Superiority');
    expect(resource).toMatchObject({ max: 4, recharge: 'short' });
  });

  it('reads a header with a byte order mark and quoted values', () => {
    const md = `\uFEFF---\ntype: subclass\nclass: "Fighter"\nsubclass: 'Battle Master'\nbron: PHB 2024\n---\n\n# B\n\nX.\n\n## Level 3: A\n\nB.`;
    expect(parseBookFile('x.md', md).subclass).toMatchObject({ className: 'Fighter', subclass: 'Battle Master' });
  });

  it('warns about an unknown class or subclass', () => {
    const md = file('class: Artificer\nsubclass: Alchemist\nbron: PHB 2024\nregels: 2024', '# A\n\nX.\n\n## Level 3: B\n\nC.');
    expect(toUserContent([parsed(md)], registry).warnings).toHaveLength(1);
  });
});
