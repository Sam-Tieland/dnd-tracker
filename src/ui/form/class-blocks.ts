import type { ContentRegistry } from '../../content/registry';
import type { Character } from '../../model/character';
import { optionsFor } from '../../rules/choices';

export interface LevelRow {
  /** Position in character.choices.levels. */
  index: number;
  /** 1-based level within this class. */
  classLevel: number;
  characterLevel: number;
  /** Class features of this class level, then subclass features of this level (only with a chosen subclass). */
  featureIds: string[];
  grantsFeat: boolean;
  /** The featureIds of this row that have options to choose from. */
  optionParentIds: string[];
}

export interface ClassBlock {
  classId: string;
  name: string;
  subclassId?: string;
  subclassLevel?: number;
  rows: LevelRow[];
}

export const FEAT_FEATURE_SUFFIXES: readonly string[] = ['ability-score-improvement', 'epic-boon', 'fighting-style', 'additional-fighting-style'];

const lastSegment = (featureId: string): string => featureId.slice(featureId.lastIndexOf(':') + 1);

export function grantsFeat(featureId: string): boolean {
  return FEAT_FEATURE_SUFFIXES.includes(lastSegment(featureId));
}

export function isSubclassSlot(featureId: string): boolean {
  return lastSegment(featureId).endsWith('-subclass');
}

/** One block per class in order of first appearance; the last level with a subclassId decides the subclass (as in rules/levels). */
export function classBlocks(character: Character, registry: ContentRegistry): ClassBlock[] {
  const blocks: ClassBlock[] = [];
  character.choices.levels.forEach((choice, index) => {
    let block = blocks.find((b) => b.classId === choice.classId);
    if (!block) {
      const cls = registry.getOf('class', choice.classId);
      block = { classId: choice.classId, name: cls?.name ?? choice.classId, subclassLevel: cls?.subclassLevels[0], rows: [] };
      blocks.push(block);
    }
    if (choice.subclassId) block.subclassId = choice.subclassId;
    const classLevel = block.rows.length + 1;
    block.rows.push({ index, classLevel, characterLevel: index + 1, featureIds: [], grantsFeat: false, optionParentIds: [] });
  });
  for (const block of blocks) {
    const cls = registry.getOf('class', block.classId);
    const sub = block.subclassId ? registry.getOf('subclass', block.subclassId) : undefined;
    for (const row of block.rows) {
      const classIds = cls?.levels.find((l) => l.level === row.classLevel)?.featureIds ?? [];
      const subIds = sub?.features.filter((f) => f.level === row.classLevel).map((f) => f.featureId) ?? [];
      row.featureIds = [...classIds, ...subIds];
      row.grantsFeat = row.index === 0 || row.featureIds.some(grantsFeat);
      row.optionParentIds = row.featureIds.filter((id) => optionsFor(registry, id).length > 0);
    }
  }
  return blocks;
}
