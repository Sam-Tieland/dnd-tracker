export type Rng = () => number;

export const cryptoRng: Rng = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

export class DiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiceError';
  }
}

export interface DiceTerm {
  count: number;
  sides: number;
  sign: 1 | -1;
}

export interface ParsedRoll {
  terms: DiceTerm[];
  modifier: number;
}

const MAX_DICE = 100;
const MAX_SIDES = 1000;
const MAX_MODIFIER = 1000;
const TERM = '(?:\\d*d\\d+|\\d+)';
const EXPRESSION = new RegExp(`^[+-]?${TERM}(?:[+-]${TERM})*$`);

/** Parse expressions like "2d6+3", "d20", "1d8 + 1d6 - 2". Throws DiceError on anything else. */
export function parseRoll(expression: string): ParsedRoll {
  if (/\d\s+\d/.test(expression)) throw new DiceError(`Invalid dice expression: "${expression}"`);
  const compact = expression.replace(/\s+/g, '').toLowerCase();
  if (!EXPRESSION.test(compact)) throw new DiceError(`Invalid dice expression: "${expression}"`);
  const terms: DiceTerm[] = [];
  let modifier = 0;
  for (const match of compact.matchAll(/([+-]?)(\d*d\d+|\d+)/g)) {
    const sign = match[1] === '-' ? -1 : 1;
    const token = match[2];
    if (!token.includes('d')) {
      modifier += sign * Number(token);
      continue;
    }
    const [countText, sidesText] = token.split('d');
    const count = countText === '' ? 1 : Number(countText);
    const sides = Number(sidesText);
    if (count < 1 || sides < 1 || sides > MAX_SIDES) throw new DiceError(`Invalid dice term: "${token}"`);
    terms.push({ count, sides, sign });
  }
  if (terms.reduce((total, term) => total + term.count, 0) > MAX_DICE) throw new DiceError(`Too many dice in "${expression}"`);
  if (Math.abs(modifier) > MAX_MODIFIER) throw new DiceError(`Modifier too large in "${expression}"`);
  return { terms, modifier };
}

export function rollDie(sides: number, rng: Rng = cryptoRng): number {
  return Math.floor(rng() * sides) + 1;
}

export interface DieRoll {
  sides: number;
  value: number;
  sign: 1 | -1;
}

export interface RollResult {
  expression: string;
  dice: DieRoll[];
  modifier: number;
  total: number;
}

export function roll(expression: string, options: { rng?: Rng; critical?: boolean } = {}): RollResult {
  const { terms, modifier } = parseRoll(expression);
  const rng = options.rng ?? cryptoRng;
  const dice: DieRoll[] = [];
  for (const term of terms) {
    const count = options.critical ? term.count * 2 : term.count;
    for (let i = 0; i < count; i += 1) dice.push({ sides: term.sides, value: rollDie(term.sides, rng), sign: term.sign });
  }
  return { expression, dice, modifier, total: dice.reduce((total, die) => total + die.sign * die.value, modifier) };
}

export type D20Mode = 'normal' | 'advantage' | 'disadvantage';

export interface D20Result {
  rolls: number[];
  kept: number;
  bonus: number;
  total: number;
  natural20: boolean;
  natural1: boolean;
}

export function rollD20(bonus: number, mode: D20Mode = 'normal', rng: Rng = cryptoRng): D20Result {
  const rolls = mode === 'normal' ? [rollDie(20, rng)] : [rollDie(20, rng), rollDie(20, rng)];
  const kept = mode === 'advantage' ? Math.max(...rolls) : mode === 'disadvantage' ? Math.min(...rolls) : rolls[0];
  return { rolls, kept, bonus, total: kept + bonus, natural20: kept === 20, natural1: kept === 1 };
}

/** A d20 test from faces the player rolled with real dice: one face, or two with Advantage or Disadvantage. */
export function d20FromFaces(faces: readonly number[], bonus: number, mode: D20Mode = 'normal'): D20Result {
  const count = mode === 'normal' ? 1 : 2;
  if (faces.length !== count || faces.some((face) => !Number.isInteger(face) || face < 1 || face > 20)) {
    throw new DiceError(`Invalid d20 faces: ${faces.join(', ')}`);
  }
  const rolls = [...faces];
  const kept = mode === 'advantage' ? Math.max(...rolls) : mode === 'disadvantage' ? Math.min(...rolls) : rolls[0];
  return { rolls, kept, bonus, total: kept + bonus, natural20: kept === 20, natural1: kept === 1 };
}

/** The dice of one term as rolled at the table: "2d6" in the expression, doubled to "4d6" on a Critical Hit. */
export function manualTerms(expression: string, critical = false): DiceTerm[] {
  return parseRoll(expression).terms.map((term) => ({ ...term, count: critical ? term.count * 2 : term.count }));
}

/** A roll from the totals the player counted per term with real dice; each total must be possible for that term. */
export function rollFromTotals(expression: string, totals: readonly number[], critical = false): RollResult {
  const { modifier } = parseRoll(expression);
  const terms = manualTerms(expression, critical);
  if (totals.length !== terms.length) throw new DiceError(`Expected ${terms.length} totals for "${expression}"`);
  const dice: DieRoll[] = terms.map((term, i) => {
    const value = totals[i];
    if (!Number.isInteger(value) || value < term.count || value > term.count * term.sides) {
      throw new DiceError(`${value} is not possible on ${term.count}d${term.sides}`);
    }
    return { sides: term.sides, value, sign: term.sign };
  });
  return { expression, dice, modifier, total: dice.reduce((total, die) => total + die.sign * die.value, modifier) };
}

/** SRD Character Creation, Random Generation: roll four d6 and add the highest three. */
export function rollAbilityScore(rng: Rng = cryptoRng): number {
  const dice = [rollDie(6, rng), rollDie(6, rng), rollDie(6, rng), rollDie(6, rng)].sort((a, b) => a - b);
  return dice[1] + dice[2] + dice[3];
}
