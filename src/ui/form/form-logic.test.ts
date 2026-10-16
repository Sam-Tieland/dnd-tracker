import { describe, expect, it } from 'vitest';
import { readVendor } from '../../../scripts/convert-srd/vendor';
import { kael, level, levels, makeCharacter, registry } from '../../rules/testing/fixtures';
import {
  addLevel, ASI_FEAT_ID, assignStandard, bonusMode, finishForm, MAX_LEVEL, parseList, pruneOptions, removeLastLevel,
  setAbilityMethod, setBackground, setBackgroundBonuses, setBaseAbility, setExpertise, setLevelAsi, setLevelFeat,
  setLevelHp, setSkill, setSubclass, subclassLevel,
} from './form-logic';

const NOW = '2026-10-16T12:00:00.000Z';

describe('abilities', () => {
  it('standard array and point buy set the starting scores; other methods keep them', () => {
    expect(setAbilityMethod(makeCharacter(), 'standard').choices.baseAbilities).toEqual({ str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 });
    expect(Object.values(setAbilityMethod(makeCharacter(), 'pointbuy').choices.baseAbilities)).toEqual([8, 8, 8, 8, 8, 8]);
    expect(setAbilityMethod(kael(), 'manual').choices.baseAbilities).toEqual(kael().choices.baseAbilities);
  });

  it('a standard array value swaps with the ability that had it', () => {
    const standard = setAbilityMethod(makeCharacter(), 'standard');
    expect(assignStandard(standard, 'cha', 15).choices.baseAbilities).toMatchObject({ str: 8, cha: 15 });
  });

  it('typed scores are whole numbers from 1 to 30; anything else changes nothing', () => {
    const c = makeCharacter();
    expect(setBaseAbility(c, 'str', 31).choices.baseAbilities.str).toBe(30);
    expect(setBaseAbility(c, 'str', -4).choices.baseAbilities.str).toBe(1);
    expect(setBaseAbility(c, 'str', 13.6).choices.baseAbilities.str).toBe(14);
    expect(setBaseAbility(c, 'str', NaN)).toBe(c);
  });
});

describe('background', () => {
  const options = ['str', 'dex', 'con'] as const;

  it('+2 and +1 on two different abilities of the background, or +1 on all three', () => {
    const c = setBackground(makeCharacter(), 'srd:background:soldier');
    expect(setBackgroundBonuses(c, options, 'two', 'str', 'con').choices.backgroundAbilityBonuses).toEqual({ str: 2, con: 1 });
    expect(setBackgroundBonuses(c, options, 'two', 'str', 'str').choices.backgroundAbilityBonuses).toEqual({ str: 2 });
    expect(setBackgroundBonuses(c, options, 'two', 'wis', 'con').choices.backgroundAbilityBonuses).toEqual({ con: 1 });
    const three = setBackgroundBonuses(c, options, 'three');
    expect(three.choices.backgroundAbilityBonuses).toEqual({ str: 1, dex: 1, con: 1 });
    expect(bonusMode(three.choices.backgroundAbilityBonuses)).toBe('three');
  });

  it('another background clears the old bonuses', () => {
    expect(setBackground(kael(), 'srd:background:sage').choices.backgroundAbilityBonuses).toEqual({});
  });
});

describe('levels', () => {
  it('adds levels up to 20 and removes the last one', () => {
    const one = addLevel(makeCharacter(), 'srd:class:fighter');
    expect(one.choices.levels).toEqual([{ classId: 'srd:class:fighter', hp: 'average', featureChoices: {} }]);
    expect(removeLastLevel(one).choices.levels).toEqual([]);
    const full = makeCharacter({ choices: { levels: levels('fighter', MAX_LEVEL) } });
    expect(addLevel(full, 'srd:class:wizard')).toBe(full);
  });

  it('rolled hit points are whole numbers of at least 1', () => {
    const c = makeCharacter({ choices: { levels: levels('fighter', 2) } });
    expect(setLevelHp(c, 1, 7.4).choices.levels[1].hp).toBe(7);
    expect(setLevelHp(c, 1, 0).choices.levels[1].hp).toBe(1);
    expect(setLevelHp(c, 1, NaN)).toBe(c);
    expect(setLevelHp(c, 1, 'average').choices.levels[1].hp).toBe('average');
  });

  it('the Ability Score Improvement feat gives +2 to one score or +1 to two', () => {
    expect(readVendor('feats.md')).toContain('Increase one ability score of your choice by 2, or increase two ability scores of your choice by 1.');
    const c = makeCharacter({ choices: { levels: levels('fighter', 4) } });
    expect(setLevelAsi(c, 3, 'str', 'str').choices.levels[3]).toMatchObject({ featId: ASI_FEAT_ID, asi: { str: 2 } });
    expect(setLevelAsi(c, 3, 'str', 'con').choices.levels[3].asi).toEqual({ str: 1, con: 1 });
    const other = setLevelFeat(setLevelAsi(c, 3, 'str', 'con'), 3, 'srd:feat:grappler');
    expect(other.choices.levels[3]).toEqual({ classId: 'srd:class:fighter', hp: 'average', featureChoices: {}, featId: 'srd:feat:grappler' });
    expect(setLevelFeat(other, 3, undefined).choices.levels[3]).toEqual({ classId: 'srd:class:fighter', hp: 'average', featureChoices: {} });
  });

  it('stores the subclass on the level that reaches the subclass level, and nowhere else', () => {
    expect(subclassLevel(registry, 'srd:class:fighter')).toBe(3);
    const c = makeCharacter({
      choices: { levels: [level('fighter'), level('wizard'), level('fighter'), level('fighter'), level('fighter', { subclassId: 'srd:subclass:champion' })] },
    });
    const set = setSubclass(c, registry, 'srd:class:fighter', 'skeleton:subclass:battle-master');
    expect(set.choices.levels.map((l) => l.subclassId)).toEqual([undefined, undefined, undefined, 'skeleton:subclass:battle-master', undefined]);
    expect(setSubclass(set, registry, 'srd:class:fighter', undefined).choices.levels.every((l) => l.subclassId === undefined)).toBe(true);
  });
});

describe('proficiencies', () => {
  it('turning a skill off also removes its expertise', () => {
    const c = setExpertise(setSkill(makeCharacter(), 'stealth', true), 'stealth', true);
    expect(c.choices).toMatchObject({ skillProficiencies: ['stealth'], expertise: ['stealth'] });
    expect(setSkill(c, 'stealth', false).choices).toMatchObject({ skillProficiencies: [], expertise: [] });
  });

  it('reads a comma-separated list, each entry once', () => {
    expect(parseList('Common, Dwarvish , ,Elvish, Common')).toEqual(['Common', 'Dwarvish', 'Elvish']);
  });
});

describe('saving the form', () => {
  it('a new character starts at full hit points and gets updatedAt', () => {
    const saved = finishForm(undefined, makeCharacter({ choices: { levels: levels('fighter', 1) } }), registry, NOW);
    expect(saved.state.hpCurrent).toBe(10);
    expect(saved.updatedAt).toBe(NOW);
  });

  it('a new level adds the hit points it gained', () => {
    const original = kael({ state: { hpCurrent: 30 } });
    const draft = { ...original, choices: { ...original.choices, levels: [...original.choices.levels, level('fighter')] } };
    expect(finishForm(original, draft, registry, NOW).state.hpCurrent).toBe(38);
  });

  it('drops chosen options whose parent feature is gone', () => {
    const cleric = makeCharacter({ choices: { levels: levels('cleric', 1), featureOptions: ['srd:feature:cleric:1:divine-order:protector'] } });
    const wizard = { ...cleric, choices: { ...cleric.choices, levels: levels('wizard', 1) } };
    expect(finishForm(cleric, wizard, registry, NOW).choices.featureOptions).toEqual([]);
    expect(pruneOptions(cleric, registry, new Set(['srd:feature:cleric:1:divine-order'])).choices.featureOptions).toEqual(cleric.choices.featureOptions);
  });
});
