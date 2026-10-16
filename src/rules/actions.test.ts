import { describe, expect, it } from 'vitest';
import type { Character } from '../model/character';
import {
  applyDamage, applyHealing, canRest, lifeState, longRest, recordDeathSave, setConditions, setDeathSaves, setExhaustion,
  setHeroicInspiration, setPactSlotsUsed, setResourceUsed, setSlotsUsed, setTempHp, shortRest, syncHitPoints,
} from './actions';
import { deriveSheet } from './derive';
import { readVendor } from '../../scripts/convert-srd/vendor';
import { kael, level, levels, makeCharacter, registry } from './testing/fixtures';

const playing = readVendor('playing-the-game.md');
const glossary = readVendor('rules-glossary.md');

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

describe('dropping to 0 hit points', () => {
  const down = (deathSaves = { successes: 0, failures: 0 }, hpTemp = 0) => kael({ state: { hpCurrent: 0, hpTemp, deathSaves } });

  it('damage at 0 hit points is one death save failure, two from a critical hit', () => {
    expect(playing).toContain('If you take any damage while you have 0 Hit Points, you suffer a Death Saving Throw failure. If the damage is from a Critical Hit, you suffer two failures instead.');
    const character = down({ successes: 1, failures: 0 });
    expect(applyDamage(character, 3, sheetOf(character)).state.deathSaves).toEqual({ successes: 1, failures: 1 });
    expect(applyDamage(character, 3, sheetOf(character), { critical: true }).state.deathSaves).toEqual({ successes: 1, failures: 2 });
  });

  it('damage at 0 hit points of at least the hit point maximum kills', () => {
    expect(playing).toContain('If the damage equals or exceeds your Hit Point maximum, you die.');
    const hit = applyDamage(down(), 40, sheetOf(down()));
    expect(hit.state.deathSaves.failures).toBe(3);
    expect(lifeState(hit, sheetOf(hit))).toBe('dead');
  });

  it('massive damage: a remainder of at least the maximum after dropping to 0 kills', () => {
    expect(playing).toContain('the character dies if the remainder equals or exceeds their Hit Point maximum');
    const character = kael({ state: { hpCurrent: 6 } });
    expect(applyDamage(character, 46, sheetOf(character)).state.deathSaves.failures).toBe(3);
    const survives = applyDamage(character, 45, sheetOf(character));
    expect(survives.state.deathSaves.failures).toBe(0);
    expect(lifeState(survives, sheetOf(survives))).toBe('dying');
  });

  it('temporary hit points absorb damage at 0 hit points before any failure', () => {
    const character = down(undefined, 5);
    expect(applyDamage(character, 3, sheetOf(character)).state.deathSaves.failures).toBe(0);
    expect(applyDamage(character, 7, sheetOf(character)).state.deathSaves.failures).toBe(1);
  });

  it('a Stable character that takes damage starts over with one failure', () => {
    const stable = down({ successes: 3, failures: 0 });
    expect(lifeState(stable, sheetOf(stable))).toBe('stable');
    expect(applyDamage(stable, 2, sheetOf(stable)).state.deathSaves).toEqual({ successes: 0, failures: 1 });
  });

  it('a character without levels has no hit points to lose and no death saves', () => {
    const fresh = makeCharacter();
    expect(applyDamage(fresh, 5, sheetOf(fresh)).state.deathSaves).toEqual({ successes: 0, failures: 0 });
    expect(lifeState(fresh, sheetOf(fresh))).toBe('alive');
  });

  it('Exhaustion level 6 is death', () => {
    expect(glossary).toContain('You die if your Exhaustion level is 6.');
    const exhausted = kael({ state: { hpCurrent: 40, exhaustion: 6 } });
    expect(lifeState(exhausted, sheetOf(exhausted))).toBe('dead');
  });
});

describe('death saving throws', () => {
  const dying = (successes = 0, failures = 0) => kael({ state: { hpCurrent: 0, deathSaves: { successes, failures } } });

  it('10 or higher succeeds, a 1 is two failures, a 20 regains 1 Hit Point', () => {
    expect(playing).toContain('If the roll is 10 or higher, you succeed. Otherwise, you fail.');
    expect(playing).toContain('When you roll a 1 on the d20 for a Death Saving Throw, you suffer two failures. If you roll a 20 on the d20, you regain 1 Hit Point.');
    const character = dying(1, 1);
    const sheet = sheetOf(character);
    expect(recordDeathSave(character, 10, sheet).state.deathSaves).toEqual({ successes: 2, failures: 1 });
    expect(recordDeathSave(character, 9, sheet).state.deathSaves).toEqual({ successes: 1, failures: 2 });
    expect(recordDeathSave(character, 1, sheet).state.deathSaves).toEqual({ successes: 1, failures: 3 });
    expect(recordDeathSave(character, 20, sheet).state).toMatchObject({ hpCurrent: 1, deathSaves: { successes: 0, failures: 0 } });
  });

  it('the third success makes the character Stable and clears the failures', () => {
    expect(playing).toContain('The number of both is reset to zero when you regain any Hit Points or become Stable.');
    const character = dying(2, 2);
    const stable = recordDeathSave(character, 15, sheetOf(character));
    expect(stable.state.deathSaves).toEqual({ successes: 3, failures: 0 });
    expect(lifeState(stable, sheetOf(stable))).toBe('stable');
  });

  it('Exhaustion lowers the roll like any D20 Test', () => {
    const tired = kael({ state: { hpCurrent: 0, exhaustion: 1 } });
    expect(recordDeathSave(tired, 11, sheetOf(tired)).state.deathSaves).toEqual({ successes: 0, failures: 1 });
  });

  it('does nothing unless the character is dying', () => {
    const fine = atFull();
    expect(recordDeathSave(fine, 15, sheetOf(fine))).toBe(fine);
  });
});

describe('conditions, Exhaustion and Heroic Inspiration', () => {
  it('keeps each condition once and Exhaustion between 0 and 6', () => {
    expect(setConditions(atFull(), ['prone', 'prone', 'grappled']).state.conditions).toEqual(['prone', 'grappled']);
    expect(setExhaustion(atFull(), 9).state.exhaustion).toBe(6);
    expect(setExhaustion(atFull(), -1).state.exhaustion).toBe(0);
    expect(setExhaustion(atFull(), NaN).state.exhaustion).toBe(0);
    expect(setHeroicInspiration(atFull(), true).state.heroicInspiration).toBe(true);
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

  it('need at least 1 hit point', () => {
    expect(glossary).toContain('To start a Short Rest, you must have at least 1 Hit Point.');
    expect(glossary).toContain('To start a Long Rest, you must have at least 1 Hit Point.');
    const down = kael({ state: { hpCurrent: 0 } });
    const sheet = sheetOf(down);
    expect(canRest(sheet)).toBe(false);
    expect(shortRest(down, sheet, { rolls: [{ die: 10, roll: 5 }] })).toBe(down);
    expect(longRest(down, sheet)).toBe(down);
  });

  it('short rest spends the rolled hit dice, heals die + CON each and recharges short-rest resources', () => {
    const rested = shortRest(tired, sheetOf(tired), { rolls: [{ die: 10, roll: 6 }, { die: 6, roll: 3 }] });
    expect(rested.state.hitDiceSpent).toEqual({ d10: 2, d6: 1 });
    expect(rested.state.hpCurrent).toBe(33);
    expect(rested.state.resourcesUsed).toEqual({ 'second-wind': 1, 'action-surge': 0, 'arcane-recovery': 1 });
    expect(rested.state.slotsUsed).toEqual({ '1': 2 });
    expect(rested.state.hpTemp).toBe(3);
  });

  it('short rest heals only for dice that were left, at least 1 per die, never above the maximum', () => {
    const rested = shortRest(tired, sheetOf(tired), { rolls: Array.from({ length: 5 }, () => ({ die: 10, roll: 10 })) });
    expect(rested.state.hitDiceSpent).toEqual({ d10: 3, d6: 0 });
    expect(rested.state.hpCurrent).toBe(40);
    const frail = makeCharacter({
      choices: { baseAbilities: { str: 10, dex: 10, con: 6, int: 10, wis: 10, cha: 10 }, levels: levels('fighter', 2) },
      state: { hpCurrent: 3 },
    });
    const healed = shortRest(frail, sheetOf(frail), { rolls: [{ die: 10, roll: 1 }, { die: 8, roll: 8 }] });
    expect(healed.state.hpCurrent).toBe(4);
    expect(healed.state.hitDiceSpent).toEqual({ d10: 1 });
  });

  it('ignores rolls that are not numbers', () => {
    const rested = shortRest(tired, sheetOf(tired), { rolls: [{ die: 10, roll: NaN }] });
    expect(rested.state.hitDiceSpent).toEqual({ d10: 1, d6: 0 });
    expect(rested.state.hpCurrent).toBe(20);
  });

  it('short rest restores Pact Magic slots', () => {
    const warlock = makeCharacter({ choices: { levels: levels('warlock', 3) }, state: { pactSlotsUsed: 2, hpCurrent: 5 } });
    expect(shortRest(warlock, sheetOf(warlock), { rolls: [] }).state.pactSlotsUsed).toBe(0);
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

  it('long rest leaves Heroic Inspiration alone without Resourceful', () => {
    const elf = makeCharacter({ choices: { speciesId: 'srd:species:elf', levels: levels('wizard', 1) }, state: { hpCurrent: 6 } });
    expect(longRest(elf, sheetOf(elf)).state.heroicInspiration).toBe(false);
  });

  it('rests normalise state that is above the maximum after a level was removed', () => {
    const stale = kael({ state: { hpCurrent: 99, hitDiceSpent: { d10: 8, d8: 2 }, resourcesUsed: { 'second-wind': 7, rage: 2 } } });
    const rested = shortRest(stale, sheetOf(stale), { rolls: [] });
    expect(rested.state.hpCurrent).toBe(40);
    expect(rested.state.hitDiceSpent).toEqual({ d10: 3, d6: 0 });
    expect(rested.state.resourcesUsed).toEqual({ 'second-wind': 1, 'action-surge': 0, 'arcane-recovery': 0 });
  });
});

describe('syncHitPoints', () => {
  it('a new character starts at full hit points', () => {
    const before = makeCharacter();
    const after = makeCharacter({ choices: { levels: levels('fighter', 1) } });
    expect(syncHitPoints(after, sheetOf(before), sheetOf(after)).state.hpCurrent).toBe(10);
  });

  it('a new level adds what the maximum gained; a removed level caps at the new maximum', () => {
    const before = kael({ state: { hpCurrent: 30 } });
    const up = kael({ state: { hpCurrent: 30 }, choices: { levels: [...kael().choices.levels, level('fighter')] } });
    expect(syncHitPoints(up, sheetOf(before), sheetOf(up)).state.hpCurrent).toBe(38);
    const full = kael({ state: { hpCurrent: 38 } });
    const down = kael({ state: { hpCurrent: 38 }, choices: { levels: kael().choices.levels.slice(0, 4) } });
    expect(syncHitPoints(down, sheetOf(full), sheetOf(down)).state.hpCurrent).toBe(34);
  });

  it('a dying character who gains hit points is no longer dying: death saves reset', () => {
    const before = kael({ state: { hpCurrent: 0, deathSaves: { successes: 1, failures: 2 } } });
    const up = kael({
      state: { hpCurrent: 0, deathSaves: { successes: 1, failures: 2 } },
      choices: { levels: [...kael().choices.levels, level('fighter')] },
    });
    const synced = syncHitPoints(up, sheetOf(before), sheetOf(up));
    expect(synced.state.hpCurrent).toBeGreaterThan(0);
    expect(synced.state.deathSaves).toEqual({ successes: 0, failures: 0 });
  });

  it('a character that stays at 0 hit points keeps its death saves', () => {
    const before = kael({ state: { hpCurrent: 0, deathSaves: { successes: 1, failures: 2 } } });
    const same = kael({ state: { hpCurrent: 0, deathSaves: { successes: 1, failures: 2 } } });
    const synced = syncHitPoints(same, sheetOf(before), sheetOf(same));
    expect(synced.state.hpCurrent).toBe(0);
    expect(synced.state.deathSaves).toEqual({ successes: 1, failures: 2 });
  });
});
