import type { ActiveFeature } from '../../rules/types';

export interface FeatureGroup {
  key: string;
  title: string;
  /** Id of the class, subclass or species behind the group (not for feats). */
  ownerId?: string;
  features: ActiveFeature[];
}

/** Features per class, subclass, species and one group for feats. Chosen options show inside their parent feature. */
export function groupFeatures(features: readonly ActiveFeature[]): FeatureGroup[] {
  const groups: FeatureGroup[] = [];
  for (const feature of features) {
    if (feature.origin === 'option') continue;
    const title = feature.origin === 'feat' ? 'Feats' : feature.ownerName;
    const key = `${feature.origin}:${title}`;
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, title, ownerId: feature.ownerId, features: [] };
      groups.push(group);
    }
    group.features.push(feature);
  }
  return groups;
}
