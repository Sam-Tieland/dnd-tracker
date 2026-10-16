import type { D20Mode, D20Result, RollResult } from '../../dice/dice';
import { formatMod } from '../format';

export interface DiceEntry {
  id: number;
  label: string;
  total: number;
  detail: string;
  natural20?: boolean;
  natural1?: boolean;
}

export const HISTORY_LIMIT = 20;

/** Spec §10: the last 20 rolls, newest first. */
export function addEntry(history: readonly DiceEntry[], entry: DiceEntry): DiceEntry[] {
  return [entry, ...history].slice(0, HISTORY_LIMIT);
}

/** "d20 (14) +5"; with Advantage or Disadvantage both dice: "d20 Advantage (9, 14) +5". */
export function describeD20(result: D20Result, mode: D20Mode): string {
  const dice = mode === 'normal' ? `d20 (${result.kept})` : `d20 ${mode === 'advantage' ? 'Advantage' : 'Disadvantage'} (${result.rolls.join(', ')})`;
  return result.bonus === 0 ? dice : `${dice} ${formatMod(result.bonus)}`;
}

/** "2d6+3: 4 + 6 + 3", with minus signs for subtracted dice and modifiers. */
export function describeRoll(result: RollResult): string {
  const dice = result.dice.map((die, i) => (i === 0 ? `${die.sign < 0 ? '-' : ''}${die.value}` : `${die.sign < 0 ? ' - ' : ' + '}${die.value}`)).join('');
  const sign = result.modifier < 0 ? '-' : '+';
  const modifier = result.modifier === 0 ? '' : dice === '' ? `${result.modifier}` : ` ${sign} ${Math.abs(result.modifier)}`;
  return `${result.expression}: ${dice}${modifier}`;
}
