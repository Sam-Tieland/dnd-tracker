import { beforeAll, describe, expect, it } from 'vitest';
import { convertClasses, type ClassConversion } from './classes';
import { readVendor } from './vendor';

let result: ClassConversion;
beforeAll(() => {
  result = convertClasses(readVendor('classes.md'));
});
const cls = (id: string) => result.classes.find((c) => c.id === id)!;
const feature = (id: string) => result.features.find((f) => f.id === id);

describe('convertClasses', () => {
  it('finds all 12 classes and their SRD subclass', () => {
    expect(result.classes.map((c) => c.name)).toEqual([
      'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard',
    ]);
    expect(result.subclasses.map((s) => s.name)).toEqual([
      'Path of the Berserker', 'College of Lore', 'Life Domain', 'Circle of the Land', 'Champion', 'Warrior of the Open Hand',
      'Oath of Devotion', 'Hunter', 'Thief', 'Draconic Sorcery', 'Fiend Patron', 'Evoker',
    ]);
  });

  it('reads hit dice and keeps the raw core traits', () => {
    expect(result.classes.map((c) => c.hitDie)).toEqual([12, 8, 8, 8, 10, 8, 10, 10, 8, 6, 8, 6]);
    expect(cls('srd:class:fighter').coreTraits['Primary Ability']).toBe('Strength or Dexterity');
    expect(cls('srd:class:barbarian').multiclassText).toContain('training with Shields');
  });

  it('reads subclass levels from the features table', () => {
    expect(cls('srd:class:barbarian').subclassLevels).toEqual([3, 6, 10, 14]);
    expect(cls('srd:class:fighter').subclassLevels).toEqual([3, 7, 10, 15, 18]);
    expect(cls('srd:class:paladin').subclassLevels).toEqual([3, 7, 15, 20]);
    expect(cls('srd:class:rogue').subclassLevels).toEqual([3, 9, 13, 17]);
    expect(cls('srd:class:cleric').subclassLevels).toEqual([3, 6, 17]);
  });

  it('resolves table feature names to feature ids', () => {
    const barbarian = cls('srd:class:barbarian');
    expect(barbarian.levels).toHaveLength(20);
    expect(barbarian.levels[0].featureIds).toEqual([
      'srd:feature:barbarian:1:rage',
      'srd:feature:barbarian:1:unarmored-defense',
      'srd:feature:barbarian:1:weapon-mastery',
    ]);
    expect(barbarian.levels[16].featureIds).toContain('srd:feature:barbarian:17:improved-brutal-strike');
    expect(cls('srd:class:fighter').levels[5].featureIds).toContain('srd:feature:fighter:4:ability-score-improvement');
    expect(cls('srd:class:warlock').levels[12].featureIds).toContain('srd:feature:warlock:11:mystic-arcanum');
  });

  it('keeps extra columns as text', () => {
    expect(cls('srd:class:barbarian').levels.map((l) => l.columns.rages)).toEqual([
      '2', '2', '3', '3', '3', '4', '4', '4', '4', '4', '4', '5', '5', '5', '5', '5', '6', '6', '6', '6',
    ]);
    expect(cls('srd:class:monk').levels[4].columns['focus-points']).toBe('5');
    expect(cls('srd:class:monk').levels[1].columns['unarmored-movement']).toBe('+10 ft.');
    expect(Object.keys(cls('srd:class:wizard').levels[0].columns)).toEqual(['proficiency-bonus', 'cantrips', 'prepared-spells']);
  });

  it('reads spell slots and pact magic', () => {
    expect(cls('srd:class:wizard').slotsByLevel![4]).toEqual([4, 3, 2, 0, 0, 0, 0, 0, 0]);
    expect(cls('srd:class:bard').slotsByLevel![19]).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1]);
    expect(cls('srd:class:paladin').slotsByLevel![0]).toEqual([2, 0, 0, 0, 0]);
    expect(cls('srd:class:fighter').slotsByLevel).toBeUndefined();
    expect(cls('srd:class:warlock').slotsByLevel).toBeUndefined();
    expect(cls('srd:class:warlock').pactSlotsByLevel![2]).toEqual({ slots: 2, slotLevel: 2 });
    expect(cls('srd:class:warlock').pactSlotsByLevel![10]).toEqual({ slots: 3, slotLevel: 5 });
  });

  it('creates features with text and markers', () => {
    expect(feature('srd:feature:barbarian:1:rage')!.text).toContain('Rages column');
    expect(feature('srd:feature:barbarian:3:barbarian-subclass')!.marker).toBe('subclass');
    expect(feature('srd:feature:fighter:4:ability-score-improvement')!.marker).toBe('asi');
    expect(feature('srd:feature:fighter:19:epic-boon')!.marker).toBe('epicBoon');
    expect(feature('srd:feature:paladin:1:lay-on-hands')).toBeDefined();
    expect(feature('srd:feature:monk:2:monks-focus')).toBeDefined();
  });

  it('links subclass features', () => {
    const champion = result.subclasses.find((s) => s.id === 'srd:subclass:champion')!;
    expect(champion.classId).toBe('srd:class:fighter');
    expect(champion.features.map((f) => f.level)).toEqual([3, 3, 7, 10, 15, 18]);
    expect(champion.features[0].featureId).toBe('srd:feature:champion:3:improved-critical');
    expect(feature('srd:feature:champion:3:improved-critical')).toBeDefined();
  });

  it('keeps metamagic and invocation options', () => {
    expect(result.features.filter((f) => f.optionGroup === 'metamagic')).toHaveLength(10);
    expect(result.features.filter((f) => f.optionGroup === 'eldritch-invocation')).toHaveLength(28);
    expect(feature('srd:feature:eldritch-invocation:agonizing-blast')!.text).toContain('Prerequisite');
  });

  it('produces unique feature ids', () => {
    const ids = result.features.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
