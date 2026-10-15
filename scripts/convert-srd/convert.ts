import {
  ArmorSchema, BackgroundSchema, FeatSchema, FeatureSchema, GearSchema, GeneratedClassSchema, MagicItemSchema,
  SpeciesSchema, SpellSchema, SubclassSchema, WeaponSchema,
} from '../../src/content/schema';
import { convertClasses } from './classes';
import { convertEquipment } from './equipment';
import { convertFeats } from './feats';
import { convertMagicItems } from './magic-items';
import { convertOrigins } from './origins';
import { convertSpells } from './spells';
import { readVendor } from './vendor';

export const OUTPUT_SCHEMAS = {
  classes: GeneratedClassSchema,
  subclasses: SubclassSchema,
  features: FeatureSchema,
  species: SpeciesSchema,
  backgrounds: BackgroundSchema,
  feats: FeatSchema,
  spells: SpellSchema,
  weapons: WeaponSchema,
  armor: ArmorSchema,
  gear: GearSchema,
  'magic-items': MagicItemSchema,
} as const;

export function convertAll() {
  const classes = convertClasses(readVendor('classes.md'));
  const origins = convertOrigins(readVendor('character-origins.md'));
  const equipment = convertEquipment(readVendor('equipment.md'));
  return {
    classes: classes.classes,
    subclasses: classes.subclasses,
    features: [...classes.features, ...origins.features],
    species: origins.species,
    backgrounds: origins.backgrounds,
    feats: convertFeats(readVendor('feats.md')),
    spells: convertSpells(readVendor('spells.md')),
    weapons: equipment.weapons,
    armor: equipment.armor,
    gear: equipment.gear,
    'magic-items': convertMagicItems(readVendor('magic-items.md')),
  };
}

export type ConvertedSrd = ReturnType<typeof convertAll>;
