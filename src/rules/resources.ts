import type { Effect } from '../content/schema';
import { evalFormula, type FormulaContext } from './formula';
import type { ResourceResult } from './types';

/** Resources in feature order; a later resourceRecharge effect changes the recharge. Used counts are clamped to the maximum. */
export function computeResources(effects: Effect[], ctx: FormulaContext, used: Record<string, number>): ResourceResult[] {
  const resources = new Map<string, ResourceResult>();
  for (const effect of effects) {
    if (effect.kind !== 'resource') continue;
    resources.set(effect.key, {
      key: effect.key,
      name: effect.name,
      max: Math.max(0, evalFormula(effect.max, ctx)),
      used: 0,
      recharge: effect.recharge,
      shortRestRegain: effect.shortRestRegain === undefined ? 0 : evalFormula(effect.shortRestRegain, ctx),
      pool: effect.pool ?? false,
    });
  }
  for (const effect of effects) {
    if (effect.kind === 'resourceRecharge') {
      const resource = resources.get(effect.key);
      if (resource) resource.recharge = effect.recharge;
    }
  }
  for (const resource of resources.values()) resource.used = Math.min(resource.max, Math.max(0, used[resource.key] ?? 0));
  return [...resources.values()].filter((r) => r.max > 0);
}
