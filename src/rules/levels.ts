import type { ContentRegistry } from '../content/registry';
import type { Character } from '../model/character';
import type { ClassLevel, Warning } from './types';
import { unknownContent } from './warnings';

/** +2 at levels 1–4, +3 at 5–8, … +6 at 17–20 (Character Advancement table). Level 0 counts as 1. */
export function proficiencyBonus(totalLevel: number): number {
  return Math.floor((Math.max(1, totalLevel) - 1) / 4) + 2;
}

export function getClassLevels(character: Character, registry: ContentRegistry, warnings: Warning[]): ClassLevel[] {
  const result: ClassLevel[] = [];
  for (const choice of character.choices.levels) {
    let entry = result.find((c) => c.classId === choice.classId);
    if (!entry) {
      const cls = registry.getOf('class', choice.classId);
      if (!cls) {
        unknownContent(warnings, choice.classId);
        continue;
      }
      entry = { classId: cls.id, name: cls.name, level: 0, hitDie: cls.hitDie };
      result.push(entry);
    }
    entry.level += 1;
    if (choice.subclassId) {
      const sub = registry.getOf('subclass', choice.subclassId);
      if (sub) {
        entry.subclassId = sub.id;
        entry.subclassName = sub.name;
      } else {
        unknownContent(warnings, choice.subclassId);
      }
    }
  }
  return result;
}
