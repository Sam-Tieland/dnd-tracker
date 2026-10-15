import type { Ability } from './constants';
import { contentId, slugify } from './ids';
import type { ClassDef, FeatureDef, SubclassDef } from './schema';

interface SkeletonEntry {
  classId: string;
  name: string;
  spellcasting?: Ability;
}

/**
 * PHB: names of the 2024 Player's Handbook subclasses that are not in the SRD.
 * Only the names; feature names and texts stay empty and are filled in by the player.
 */
export const SKELETON_SUBCLASSES: SkeletonEntry[] = [
  { classId: 'srd:class:barbarian', name: 'Path of the Wild Heart' },
  { classId: 'srd:class:barbarian', name: 'Path of the World Tree' },
  { classId: 'srd:class:barbarian', name: 'Path of the Zealot' },
  { classId: 'srd:class:bard', name: 'College of Dance' },
  { classId: 'srd:class:bard', name: 'College of Glamour' },
  { classId: 'srd:class:bard', name: 'College of Valor' },
  { classId: 'srd:class:cleric', name: 'Light Domain' },
  { classId: 'srd:class:cleric', name: 'Trickery Domain' },
  { classId: 'srd:class:cleric', name: 'War Domain' },
  { classId: 'srd:class:druid', name: 'Circle of the Moon' },
  { classId: 'srd:class:druid', name: 'Circle of the Sea' },
  { classId: 'srd:class:druid', name: 'Circle of the Stars' },
  { classId: 'srd:class:fighter', name: 'Battle Master' },
  // PHB: Eldritch Knight and Arcane Trickster are Intelligence-based third casters.
  { classId: 'srd:class:fighter', name: 'Eldritch Knight', spellcasting: 'int' },
  { classId: 'srd:class:fighter', name: 'Psi Warrior' },
  { classId: 'srd:class:monk', name: 'Warrior of Mercy' },
  { classId: 'srd:class:monk', name: 'Warrior of Shadow' },
  { classId: 'srd:class:monk', name: 'Warrior of the Elements' },
  { classId: 'srd:class:paladin', name: 'Oath of Glory' },
  { classId: 'srd:class:paladin', name: 'Oath of the Ancients' },
  { classId: 'srd:class:paladin', name: 'Oath of Vengeance' },
  { classId: 'srd:class:ranger', name: 'Beast Master' },
  { classId: 'srd:class:ranger', name: 'Fey Wanderer' },
  { classId: 'srd:class:ranger', name: 'Gloom Stalker' },
  { classId: 'srd:class:rogue', name: 'Arcane Trickster', spellcasting: 'int' },
  { classId: 'srd:class:rogue', name: 'Assassin' },
  { classId: 'srd:class:rogue', name: 'Soulknife' },
  { classId: 'srd:class:sorcerer', name: 'Aberrant Sorcery' },
  { classId: 'srd:class:sorcerer', name: 'Clockwork Sorcery' },
  { classId: 'srd:class:sorcerer', name: 'Wild Magic Sorcery' },
  { classId: 'srd:class:warlock', name: 'Archfey Patron' },
  { classId: 'srd:class:warlock', name: 'Celestial Patron' },
  { classId: 'srd:class:warlock', name: 'Great Old One Patron' },
  { classId: 'srd:class:wizard', name: 'Abjurer' },
  { classId: 'srd:class:wizard', name: 'Diviner' },
  { classId: 'srd:class:wizard', name: 'Illusionist' },
];

/** One empty feature per subclass level of the class (levels come from the SRD class table). */
export function buildSkeletons(classes: ClassDef[]): { subclasses: SubclassDef[]; features: FeatureDef[] } {
  const subclasses: SubclassDef[] = [];
  const features: FeatureDef[] = [];
  for (const entry of SKELETON_SUBCLASSES) {
    const cls = classes.find((c) => c.id === entry.classId);
    if (!cls) throw new Error(`skeleton ${entry.name}: unknown class ${entry.classId}`);
    const slug = slugify(entry.name);
    const own = cls.subclassLevels.map(
      (level, index): FeatureDef => ({
        id: contentId('skeleton', 'feature', slug, level, 'feature'),
        type: 'feature',
        source: 'skeleton',
        name: '',
        text: '',
        effects:
          entry.spellcasting && index === 0
            ? [{ kind: 'spellcasting', classId: entry.classId, ability: entry.spellcasting, progression: 'third' }]
            : [],
      }),
    );
    features.push(...own);
    subclasses.push({
      id: contentId('skeleton', 'subclass', entry.name),
      type: 'subclass',
      source: 'skeleton',
      name: entry.name,
      classId: entry.classId,
      text: '',
      features: own.map((feature, index) => ({ level: cls.subclassLevels[index], featureId: feature.id })),
    });
  }
  return { subclasses, features };
}
