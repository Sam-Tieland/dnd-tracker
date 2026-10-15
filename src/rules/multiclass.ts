import type { Ability } from '../content/constants';
import type { ContentRegistry } from '../content/registry';
import type { AbilityResult, ClassLevel, Warning } from './types';
import { warnOnce } from './warnings';

/** SRD: to multiclass you need 13 in the primary ability of every class you have. Only a warning; the DM decides. */
export function multiclassWarnings(
  classLevels: ClassLevel[],
  registry: ContentRegistry,
  abilities: Record<Ability, AbilityResult>,
  warnings: Warning[],
): void {
  if (classLevels.length < 2) return;
  for (const cl of classLevels) {
    const cls = registry.getOf('class', cl.classId);
    if (!cls) continue;
    const meets = cls.primaryAbilities.abilities.map((ability) => abilities[ability].score >= 13);
    const ok = cls.primaryAbilities.mode === 'all' ? meets.every(Boolean) : meets.some(Boolean);
    if (!ok) warnOnce(warnings, { code: 'multiclass-prerequisite', detail: cl.classId });
  }
}
