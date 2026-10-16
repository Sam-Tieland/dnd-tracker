import { describe, expect, it } from 'vitest';
import { readVendor } from '../../../scripts/convert-srd/vendor';
import { deriveSheet } from '../../rules/derive';
import { levels, makeCharacter, registry } from '../../rules/testing/fixtures';
import { addSpell, MAGIC_INITIATE_ABILITIES, MAGIC_INITIATE_LISTS, playColumns, removeSpell, setPrepared } from './spell-logic';

const fireBolt = { classId: 'srd:class:wizard', spellId: 'srd:spell:fire-bolt', prepared: true };

describe('spell list', () => {
  it('adds a spell once per spell list and ability', () => {
    const once = addSpell([], fireBolt);
    expect(addSpell(once, fireBolt)).toEqual([fireBolt]);
    expect(addSpell(once, { ...fireBolt, classId: 'srd:class:sorcerer' })).toHaveLength(2);
    expect(addSpell(once, { ...fireBolt, ability: 'cha' })).toHaveLength(2);
  });

  it('prepares and removes by position', () => {
    const two = [fireBolt, { ...fireBolt, spellId: 'srd:spell:magic-missile', prepared: false }];
    expect(setPrepared(two, 1, true)[1].prepared).toBe(true);
    expect(removeSpell(two, 0)).toEqual([two[1]]);
  });

  it('Magic Initiate lists and abilities come from the feat text', () => {
    const feat = readVendor('feats.md');
    expect(feat).toContain('from the Cleric, Druid, or Wizard spell list. Intelligence, Wisdom, or Charisma is your spellcasting ability');
    expect(MAGIC_INITIATE_LISTS).toEqual(['srd:class:cleric', 'srd:class:druid', 'srd:class:wizard']);
    expect(MAGIC_INITIATE_ABILITIES).toEqual(['int', 'wis', 'cha']);
  });
});

describe('playColumns', () => {
  it('shows the class table values that matter in play, not the ones shown elsewhere', () => {
    const sheet = deriveSheet(makeCharacter({ choices: { levels: [...levels('barbarian', 5), ...levels('wizard', 1)] } }), registry);
    expect(playColumns(sheet)).toEqual([
      { key: 'srd:class:barbarian:rages', label: 'Barbarian: Rages', value: '3' },
      { key: 'srd:class:barbarian:rage-damage', label: 'Barbarian: Rage Damage', value: '+2' },
      { key: 'srd:class:barbarian:weapon-mastery', label: 'Barbarian: Weapon Mastery', value: '3' },
    ]);
  });
});
