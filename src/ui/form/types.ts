import type { Character } from '../../model/character';
import type { DerivedSheet } from '../../rules/types';

export interface SectionProps {
  character: Character;
  sheet: DerivedSheet;
  onChange: (next: Character) => void;
}
