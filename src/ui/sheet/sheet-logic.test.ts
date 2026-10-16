import { describe, expect, it } from 'vitest';
import { readVendor } from '../../../scripts/convert-srd/vendor';
import { BonusTargetSchema } from '../../content/schema';
import { deriveSheet } from '../../rules/derive';
import { kael, registry } from '../../rules/testing/fixtures';
import { groupFeatures } from './feature-groups';
import { MAX_ATTUNED, newItem, removeItem, setCoin, setQty, updateItem } from './inventory-logic';
import { overrideTargets, targetLabel } from './override-targets';

describe('inventory', () => {
  const items = [newItem({ customName: 'Rope', qty: 1, equipped: false, attuned: false }, 'a'), newItem({ itemId: 'srd:armor:chain-mail', qty: 1, equipped: false, attuned: false }, 'b')];

  it('changes and removes items by id', () => {
    expect(updateItem(items, 'b', { equipped: true })[1].equipped).toBe(true);
    expect(removeItem(items, 'a').map((i) => i.id)).toEqual(['b']);
  });

  it('quantities and coins are whole numbers from 0; anything else changes nothing', () => {
    expect(setQty(items, 'a', 2.6)[0].qty).toBe(3);
    expect(setQty(items, 'a', -4)[0].qty).toBe(0);
    expect(setQty(items, 'a', NaN)[0].qty).toBe(1);
    const coins = { cp: 0, sp: 0, ep: 0, gp: 10, pp: 0 };
    expect(setCoin(coins, 'gp', 12.2).gp).toBe(12);
    expect(setCoin(coins, 'gp', NaN)).toEqual(coins);
  });

  it('new items get ids that fit attack:<id>', () => {
    expect(BonusTargetSchema.safeParse(`attack:${newItem({ qty: 1, equipped: false, attuned: false }).id}`).success).toBe(true);
  });

  it('three attuned items at most (SRD)', () => {
    expect(readVendor('equipment.md')).toContain('You can be attuned to no more than three magic items at a time.');
    expect(MAX_ATTUNED).toBe(3);
  });
});

describe('override targets', () => {
  const options = overrideTargets(kael(), registry);

  it('every target is a valid bonus target', () => {
    for (const option of options) expect(BonusTargetSchema.safeParse(option.value).success, option.value).toBe(true);
  });

  it('weapons in the inventory get their own attack and damage targets', () => {
    expect(targetLabel('attack:i3', options)).toBe('Attack (Longsword)');
    expect(targetLabel('skill:sleight-of-hand', options)).toBe('Sleight of Hand');
    expect(targetLabel('attack:gone', options)).toBe('attack:gone');
  });
});

describe('groupFeatures', () => {
  it('groups by class, subclass, species and feats, in sheet order', () => {
    expect(groupFeatures(deriveSheet(kael(), registry).features).map((g) => g.title)).toEqual(['Fighter', 'Champion', 'Wizard', 'Human', 'Feats']);
  });
});
