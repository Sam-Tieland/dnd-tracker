import { ABILITY_BY_NAME, type Ability } from '../content/constants';
import type { DerivedSheet } from '../rules/types';

/** +3 / +0 / -1, as on a character sheet. */
export function formatMod(value: number): string {
  return value >= 0 ? `+${value}` : `-${Math.abs(value)}`;
}

const ABILITY_NAMES = Object.fromEntries(Object.entries(ABILITY_BY_NAME).map(([name, ability]) => [ability, name])) as Record<Ability, string>;

export function abilityName(ability: Ability): string {
  return ABILITY_NAMES[ability];
}

/** "sleight-of-hand" -> "Sleight of Hand". Skill, condition and column names are English game terms. */
export function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((word, i) => (i > 0 && word === 'of' ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}

/** "Fighter 3 (Champion) / Wizard 2" */
export function classSummary(sheet: DerivedSheet): string {
  return sheet.classLevels.map((cl) => `${cl.name} ${cl.level}${cl.subclassName ? ` (${cl.subclassName})` : ''}`).join(' / ');
}

/**
 * SRD text as plain paragraphs: table rows become lines with " · " between the cells, HTML tags and Markdown emphasis
 * markers are dropped. Nothing is rendered as HTML, so text from own content can never inject markup.
 */
export function plainParagraphs(text: string): string[] {
  const plain = text
    .replace(/<\/t[hd]>\s*<t[hd][^>]*>/g, ' · ')
    .replace(/\s*<\/tr>\s*(?:<\/?t(?:head|body)[^>]*>\s*)*<tr[^>]*>\s*/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[\s(])_([^_\n]+)_/g, '$1$2');
  return plain
    .split(/\n\s*\n/)
    .map((p) => p.split('\n').map((line) => line.trim()).filter(Boolean).join('\n'))
    .filter(Boolean);
}
