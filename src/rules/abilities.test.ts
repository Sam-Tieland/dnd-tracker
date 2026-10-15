import { describe, expect, it } from 'vitest';
import { abilityModifier, computeAbilities } from './abilities';
import { kael, level, makeCharacter } from './testing/fixtures';
import type { Warning } from './types';

const tens = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

describe('abilityModifier', () => {
  it.each([[1, -5], [8, -1], [9, -1], [10, 0], [11, 0], [12, 1], [15, 2], [20, 5], [30, 10]])('%i -> %i', (score, mod) =>
    expect(abilityModifier(score)).toBe(mod),
  );
});

describe('computeAbilities', () => {
  it('adds background bonuses', () => {
    const warnings: Warning[] = [];
    const result = computeAbilities(kael(), [], warnings);
    expect(result.str).toEqual({ score: 17, mod: 3, max: 20 });
    expect(result.dex).toEqual({ score: 13, mod: 1, max: 20 });
    expect(result.con).toEqual({ score: 15, mod: 2, max: 20 });
    expect(result.cha).toEqual({ score: 8, mod: -1, max: 20 });
    expect(warnings).toEqual([]);
  });

  it('adds ability score improvements from level choices', () => {
    const character = makeCharacter({ choices: { baseAbilities: tens, levels: [level('fighter'), level('fighter', { asi: { dex: 2, con: 1 } })] } });
    const result = computeAbilities(character, [], []);
    expect([result.dex.score, result.con.score]).toEqual([12, 11]);
  });

  it('caps at the maximum and warns', () => {
    const warnings: Warning[] = [];
    const character = makeCharacter({ choices: { baseAbilities: { ...tens, str: 20 }, backgroundAbilityBonuses: { str: 2 } } });
    expect(computeAbilities(character, [], warnings).str).toEqual({ score: 20, mod: 5, max: 20 });
    expect(warnings).toEqual([{ code: 'ability-over-max', detail: 'str' }]);
  });

  it('raises the maximum with abilityMax and applies numeric ability bonuses', () => {
    const warnings: Warning[] = [];
    const character = makeCharacter({
      choices: { baseAbilities: { ...tens, str: 20 }, backgroundAbilityBonuses: { str: 2 } },
      overrides: [{ id: 'o1', target: 'abilityMax:str', value: 2, reason: 'Epic Boon' }],
    });
    const result = computeAbilities(character, [{ kind: 'bonus', target: 'ability:dex', value: 2 }], warnings);
    expect(result.str).toEqual({ score: 22, mod: 6, max: 22 });
    expect(result.dex.score).toBe(12);
    expect(warnings).toEqual([]);
  });
});
