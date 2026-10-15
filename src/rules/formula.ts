import type { Ability } from '../content/constants';
import type { Formula } from '../content/schema';

export interface FormulaContext {
  pb: number;
  mods: Record<Ability, number>;
  totalLevel: number;
  classLevel(classId: string): number;
  column(classId: string, key: string): number;
}

export function evalFormula(formula: Formula, ctx: FormulaContext): number {
  if (typeof formula === 'number') return formula;
  if ('pb' in formula) return ctx.pb;
  if ('mod' in formula) return Math.max(ctx.mods[formula.mod], formula.min ?? -Infinity);
  if ('level' in formula) return (formula.level === 'total' ? ctx.totalLevel : ctx.classLevel(formula.level)) * (formula.times ?? 1);
  if ('column' in formula) return ctx.column(formula.column.classId, formula.column.key);
  if ('atLevel' in formula) {
    const classLevel = ctx.classLevel(formula.atLevel.classId);
    let value = 0;
    for (const [minLevel, atValue] of formula.atLevel.values) if (classLevel >= minLevel) value = atValue;
    return value;
  }
  return formula.sum.reduce<number>((total, part) => total + evalFormula(part, ctx), 0);
}

/** Number in a class table cell: "+10 ft." -> 10, "—" -> 0. The Unicode minus sign counts as a hyphen. */
export function parseColumnNumber(text: string | undefined): number {
  const match = /[-\u2212]?\d+/.exec(text ?? '');
  return match ? Number(match[0].replace('\u2212', '-')) : 0;
}
