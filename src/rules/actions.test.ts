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
    const hurt = applyDamage(kael({ state: { hpCurrent: 40, hpTemp: 5 } }), 7);
    expect([hurt.state.hpTemp, hurt.state.hpCurrent]).toEqual([0, 38]);
  });

  it('never drops below 0 and ignores negative or fractional damage', () => {
    expect(applyDamage(atFull(), 99).state.hpCurrent).toBe(0);
    expect(applyDamage(atFull(), -5).state.hpCurrent).toBe(40);
    expect(applyDamage(atFull(), 2.7).state.hpCurrent).toBe(38);
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

  it('death saves stay between 0 and 3', () => {
    expect(setDeathSaves(atFull(), 5, -1).state.deathSaves).toEqual({ successes: 3, failures: 0 });
  });
});

describe('slots and resources', () => {
  const character = atFull();
  const sheet = sheetOf(character);

  it('clamps spell slots to the maximum', () => {
    expect(setSlotsUsed(character, 1, 5, sheet).state.slotsUsed).toEqual({ '1': 3 });
    expect(setSlotsUsed(character, 2, 1, sheet).state.slotsUsed).toEqual({ '2': 0 });
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
    expect(longRest(tired, sheetOf(tired)).state).toMatchObject({
      hpCurrent: 40, hpTemp: 0, hitDiceSpent: {}, slotsUsed: {}, pactSlotsUsed: 0, resourcesUsed: {}, exhaustion: 1, heroicInspiration: true,
    });
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
