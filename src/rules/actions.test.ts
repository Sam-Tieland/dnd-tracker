import { describe, expect, it } from 'vitest';
import type { Character } from '../model/character';
import {
  applyDamage, applyHealing, longRest, setDeathSaves, setPactSlotsUsed, setResourceUsed, setSlotsUsed, setTempHp, shortRest,
} from './actions';
import { deriveSheet } from './derive';
import { kael, levels, makeCharacter, registry } from './testing/fixtures';

const sheetOf = (character: Character) => deriveSheet(character, registry);
const atFull = () => kael({ state: { hpCurrent: 40 } });

describe('hit points', () => {
  it('damage takes temporary hit points first', () => {
    const character = kael({ state: { hpCurrent: 40, hpTemp: 5 } });
    const hurt = applyDamage(character, 7, sheetOf(character));
    expect([hurt.state.hpTemp, hurt.state.hpCurrent]).toEqual([0, 38]);
  });

  it('never drops below 0 and ignores negative or fractional damage', () => {
    const character = atFull();
    const sheet = sheetOf(character);
    expect(applyDamage(character, 99, sheet).state.hpCurrent).toBe(0);
    expect(applyDamage(character, -5, sheet).state.hpCurrent).toBe(40);
    expect(applyDamage(character, 2.7, sheet).state.hpCurrent).toBe(38);
  });

  it('NaN damage is ignored instead of poisoning hit points', () => {
    const character = atFull();
    expect(applyDamage(character, NaN, sheetOf(character)).state.hpCurrent).toBe(40);
  });

  it('damage starts from the hit points the sheet shows when the stored value is above the maximum', () => {
    const stale = kael({ state: { hpCurrent: 99 } });
    expect(applyDamage(stale, 7, sheetOf(stale)).state.hpCurrent).toBe(33);
  });

  it('healing stops at the maximum and resets death saves', () => {
    const down = kael({ state: { hpCurrent: 0, deathSaves: { successes: 1, failures: 2 } } });
    const healed = applyHealing(down, 50, sheetOf(down));
    expect(healed.state.hpCurrent).toBe(40);
    expect(healed.state.deathSaves).toEqual({ successes: 0, failures: 0 });
  });

  it('temporary hit points replace instead of stacking', () => {
    expect(setTempHp(setTempHp(atFull(), 10), 4).state.hpTemp).toBe(4);
    expect(setTempHp(atFull(), -3).state.hpTemp).toBe(0);
  });

  it('non-finite temporary hit points become 0', () => {
    expect(setTempHp(atFull(), NaN).state.hpTemp).toBe(0);
    expect(setTempHp(atFull(), Infinity).state.hpTemp).toBe(0);
  });

  it('death saves stay between 0 and 3', () => {
    expect(setDeathSaves(atFull(), 5, -1).state.deathSaves).toEqual({ successes: 3, failures: 0 });
  });
});

describe('slots and resources', () => {
  const character = atFull();
  const sheet = sheetOf(character);

  it('clamps spell slots to the maximum', () => {
    expect(setSlotsUsed(character, 1, 5, sheet).state.slotsUsed).toEqual({ '1': 3 });
  });

  it('leaves the character untouched for a slot level the sheet does not have', () => {
    expect(setSlotsUsed(character, 2, 1, sheet)).toBe(character);
    expect(setSlotsUsed(character, 10, 1, sheet)).toBe(character);
  });

  it('clamps pact slots (Kael has none)', () => {
    expect(setPactSlotsUsed(character, 2, sheet).state.pactSlotsUsed).toBe(0);
  });

  it('clamps resources and ignores unknown keys', () => {
    expect(setResourceUsed(character, 'second-wind', 9, sheet).state.resourcesUsed).toEqual({ 'second-wind': 2 });
    expect(setResourceUsed(character, 'rage', 1, sheet)).toBe(character);
  });
});

describe('rests', () => {
  const tired = kael({
    state: {
      hpCurrent: 20,
      hpTemp: 3,
      hitDiceSpent: { d10: 1 },
      slotsUsed: { '1': 2 },
      resourcesUsed: { 'second-wind': 2, 'action-surge': 1, 'arcane-recovery': 1 },
      exhaustion: 2,
    },
  });

  it('short rest spends hit dice, heals and recharges short-rest resources', () => {
    const rested = shortRest(tired, sheetOf(tired), { hitDice: { d10: 1, d6: 1 }, hpRegained: 9 });
    expect(rested.state.hitDiceSpent).toEqual({ d10: 2, d6: 1 });
    expect(rested.state.hpCurrent).toBe(29);
    expect(rested.state.resourcesUsed).toEqual({ 'second-wind': 1, 'action-surge': 0, 'arcane-recovery': 1 });
    expect(rested.state.slotsUsed).toEqual({ '1': 2 });
    expect(rested.state.hpTemp).toBe(3);
  });

  it('short rest never spends more hit dice than are left, nor heals above the maximum', () => {
    const rested = shortRest(tired, sheetOf(tired), { hitDice: { d10: 5 }, hpRegained: 100 });
    expect(rested.state.hitDiceSpent).toEqual({ d10: 3, d6: 0 });
    expect(rested.state.hpCurrent).toBe(40);
  });

  it('short rest restores Pact Magic slots', () => {
    const warlock = makeCharacter({ choices: { levels: levels('warlock', 3) }, state: { pactSlotsUsed: 2, hpCurrent: 5 } });
    expect(shortRest(warlock, sheetOf(warlock), { hitDice: {}, hpRegained: 0 }).state.pactSlotsUsed).toBe(0);
  });

  it('long rest restores everything, removes one Exhaustion level and grants Heroic Inspiration to humans', () => {
    const rested = longRest(tired, sheetOf(tired));
    expect(rested.state).toMatchObject({ hpCurrent: 40, hpTemp: 0, pactSlotsUsed: 0, exhaustion: 1, heroicInspiration: true });
    expect(rested.state.hitDiceSpent).toEqual({});
    expect(rested.state.slotsUsed).toEqual({});
    expect(rested.state.resourcesUsed).toEqual({});
  });

  it('long rest gives each character its own death saves object', () => {
    const a = longRest(tired, sheetOf(tired));
    const b = longRest(atFull(), sheetOf(atFull()));
    expect(a.state.deathSaves).toEqual(b.state.deathSaves);
    expect(a.state.deathSaves).not.toBe(b.state.deathSaves);
  });

  it('non-finite hit dice and hit points regained are ignored', () => {
    const rested = shortRest(tired, sheetOf(tired), { hitDice: { d10: NaN }, hpRegained: NaN });
    expect(rested.state.hitDiceSpent).toEqual({ d10: 1, d6: 0 });
    expect(rested.state.hpCurrent).toBe(20);
  });

  it('long rest leaves Heroic Inspiration alone without Resourceful', () => {
    const elf = makeCharacter({ choices: { speciesId: 'srd:species:elf', levels: levels('wizard', 1) } });
    expect(longRest(elf, sheetOf(elf)).state.heroicInspiration).toBe(false);
  });

  it('rests normalise state that is above the maximum after a level was removed', () => {
    const stale = kael({ state: { hpCurrent: 99, hitDiceSpent: { d10: 8, d8: 2 }, resourcesUsed: { 'second-wind': 7, rage: 2 } } });
    const rested = shortRest(stale, sheetOf(stale), { hitDice: {}, hpRegained: 0 });
    expect(rested.state.hpCurrent).toBe(40);
    expect(rested.state.hitDiceSpent).toEqual({ d10: 3, d6: 0 });
    expect(rested.state.resourcesUsed).toEqual({ 'second-wind': 1, 'action-surge': 0, 'arcane-recovery': 0 });
  });
});
