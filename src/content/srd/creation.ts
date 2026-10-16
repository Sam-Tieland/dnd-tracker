import type { Ability } from '../constants';

/** SRD 5.2.1 Character Creation, Step 3: the Standard Array. */
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;

/** SRD 5.2.1 Character Creation, Step 3: 27 points; the Ability Score Point Costs table covers scores 8–15. */
export const POINT_BUY_BUDGET = 27;
export const POINT_BUY_COST: Readonly<Record<number, number>> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

/** Points spent, or undefined when a score is outside the point-buy range. */
export function pointBuyCost(scores: Record<Ability, number>): number | undefined {
  let total = 0;
  for (const score of Object.values(scores)) {
    const cost = POINT_BUY_COST[score];
    if (cost === undefined) return undefined;
    total += cost;
  }
  return total;
}
