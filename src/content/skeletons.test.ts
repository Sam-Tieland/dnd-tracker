import { describe, expect, it } from 'vitest';
import { SKELETON_SUBCLASSES } from './skeletons';

describe('SKELETON_SUBCLASSES', () => {
  it('has three subclasses per class with unique names', () => {
    expect(SKELETON_SUBCLASSES).toHaveLength(36);
    const perClass = new Map<string, number>();
    for (const entry of SKELETON_SUBCLASSES) perClass.set(entry.classId, (perClass.get(entry.classId) ?? 0) + 1);
    expect([...perClass.values()]).toEqual(Array(12).fill(3));
    expect(new Set(SKELETON_SUBCLASSES.map((e) => e.name)).size).toBe(36);
  });

  it('marks only Eldritch Knight and Arcane Trickster as spellcasters', () => {
    expect(SKELETON_SUBCLASSES.filter((e) => e.spellcasting).map((e) => e.name)).toEqual(['Eldritch Knight', 'Arcane Trickster']);
  });
});
