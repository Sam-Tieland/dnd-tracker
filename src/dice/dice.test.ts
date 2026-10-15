import { describe, expect, it } from 'vitest';
import { cryptoRng, DiceError, parseRoll, roll, rollD20, rollDie, type Rng } from './dice';

/** An RNG that makes successive dice of `sides` show the given faces. */
const faces = (sides: number, ...values: number[]): Rng => {
  let index = 0;
  return () => (values[index++ % values.length] - 0.5) / sides;
};

describe('parseRoll', () => {
  it('parses dice, modifiers and signs', () => {
    expect(parseRoll('2d6+3')).toEqual({ terms: [{ count: 2, sides: 6, sign: 1 }], modifier: 3 });
    expect(parseRoll('d20')).toEqual({ terms: [{ count: 1, sides: 20, sign: 1 }], modifier: 0 });
    expect(parseRoll(' 1D8 + 1d6 - 2 ')).toEqual({
      terms: [{ count: 1, sides: 8, sign: 1 }, { count: 1, sides: 6, sign: 1 }],
      modifier: -2,
    });
    expect(parseRoll('1d4-1d4').terms[1]).toEqual({ count: 1, sides: 4, sign: -1 });
  });

  it.each(['', 'abc', '2d', 'd0', '2d6++1', '101d6', '1000d6', '60d6+60d6', '1d1001', '2d6 3', '1 2', '2 0d6'])('rejects "%s"', (expression) => {
    expect(() => parseRoll(expression)).toThrow(DiceError);
  });
});

describe('rollDie', () => {
  it('maps the RNG edges onto the faces', () => {
    expect(rollDie(6, () => 0)).toBe(1);
    expect(rollDie(6, () => 0.999999)).toBe(6);
    expect(rollDie(1000, () => 1 - 2 ** -32)).toBe(1000);
    expect(rollDie(1000, () => 0)).toBe(1);
  });
});

describe('roll', () => {
  it('adds dice and modifier', () => {
    const result = roll('2d6+3', { rng: faces(6, 4, 5) });
    expect(result.dice.map((d) => d.value)).toEqual([4, 5]);
    expect(result.total).toBe(12);
  });

  it('subtracts negative dice terms', () => {
    expect(roll('1d4-1d4', { rng: faces(4, 3, 1) }).total).toBe(2);
  });

  it('doubles the dice on a critical hit, not the modifier', () => {
    const result = roll('1d8+3', { rng: faces(8, 6, 2), critical: true });
    expect(result.dice).toHaveLength(2);
    expect(result.total).toBe(11);
  });

  it('stays within the die size with the real RNG', () => {
    for (let i = 0; i < 200; i += 1) {
      const value = roll('1d6', { rng: cryptoRng }).total;
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    }
  });
});

describe('rollD20', () => {
  it('keeps the higher roll with advantage and the lower with disadvantage', () => {
    expect(rollD20(5, 'advantage', faces(20, 3, 17))).toMatchObject({ rolls: [3, 17], kept: 17, total: 22 });
    expect(rollD20(5, 'disadvantage', faces(20, 3, 17))).toMatchObject({ rolls: [3, 17], kept: 3, total: 8 });
    expect(rollD20(0, 'normal', faces(20, 12))).toMatchObject({ rolls: [12], kept: 12 });
  });

  it('flags natural 20 and natural 1', () => {
    expect(rollD20(2, 'normal', faces(20, 20))).toMatchObject({ natural20: true, natural1: false, total: 22 });
    expect(rollD20(2, 'normal', faces(20, 1))).toMatchObject({ natural20: false, natural1: true, total: 3 });
  });
});
