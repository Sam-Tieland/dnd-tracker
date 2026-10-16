import { ABILITIES, type Ability } from '../content/constants';
import type { ContentRegistry } from '../content/registry';
import type { MessageKey, Translate } from '../i18n/i18n';
import type { Warning, WarningCode } from '../rules/types';
import { abilityName } from './format';

/** One message per warning code; a new code without a message is a compile error. */
const WARNING_KEYS: Record<WarningCode, MessageKey> = {
  'unknown-content': 'warning.unknown-content',
  'multiclass-prerequisite': 'warning.multiclass-prerequisite',
  'ability-over-max': 'warning.ability-over-max',
  'cantrip-without-caster': 'warning.cantrip-without-caster',
  'armor-untrained': 'warning.armor-untrained',
};

/** Spec §15: unknown content shows as "Unknown: <id>"; other details show the content name or ability name. */
export function warningText(warning: Warning, t: Translate, registry: ContentRegistry): string {
  const { detail } = warning;
  const name = (ABILITIES as readonly string[]).includes(detail) ? abilityName(detail as Ability) : registry.get(detail)?.name || detail;
  return t(WARNING_KEYS[warning.code], { name });
}
