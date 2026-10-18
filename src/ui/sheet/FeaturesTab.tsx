import { useState } from 'react';
import { useI18n } from '../../i18n/i18n';
import { optionsFor } from '../../rules/choices';
import { NumberInput } from '../components/NumberInput';
import { WarningList } from '../components/WarningList';
import { BookLink } from '../books/BookLink';
import { useAppData } from '../data';
import { formatMod, plainParagraphs } from '../format';
import { groupFeatures } from './feature-groups';
import { overrideTargets, targetLabel } from './override-targets';
import type { ReadySession } from './session';

/** Spec §4: overrides stay visible as the source of a number, next to the feature effects. */
function BonusBreakdown({ session }: { session: ReadySession }) {
  const { character, sheet } = session;
  const { registry } = useAppData();
  const { t } = useI18n();
  if (sheet.bonusParts.length === 0) return null;
  const options = overrideTargets(character, registry);
  const targets = [...new Set(sheet.bonusParts.map((p) => p.target))];
  return (
    <section>
      <h2>{t('features.bonuses')}</h2>
      <dl className="breakdown">
        {targets.map((target) => (
          <div key={target}>
            <dt>{targetLabel(target, options)}</dt>
            <dd>
              {sheet.bonusParts
                .filter((p) => p.target === target)
                .map((p) => `${formatMod(p.value)} ${p.source || '?'}${p.override ? ` (${t('features.override')})` : ''}`)
                .join(' · ')}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function OverridesEditor({ session }: { session: ReadySession }) {
  const { character, commit } = session;
  const { registry } = useAppData();
  const { t } = useI18n();
  const options = overrideTargets(character, registry);
  const [target, setTarget] = useState('ac');
  const [value, setValue] = useState(1);
  const [reason, setReason] = useState('');
  const add = () => {
    if (!Number.isInteger(value) || value === 0) return;
    commit({ ...character, overrides: [...character.overrides, { id: crypto.randomUUID(), target, value, reason: reason.trim() }] });
    setReason('');
  };
  return (
    <section>
      <h2>{t('overrides.title')}</h2>
      <p className="muted">{t('overrides.help')}</p>
      <ul className="overrides">
        {character.overrides.map((o) => (
          <li key={o.id} className="row">
            <span>
              {targetLabel(o.target, options)} {formatMod(o.value)}
              {o.reason ? ` · ${o.reason}` : ''}
            </span>
            <button
              type="button"
              aria-label={t('overrides.remove', { name: targetLabel(o.target, options) })}
              onClick={() => commit({ ...character, overrides: character.overrides.filter((x) => x.id !== o.id) })}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="row">
        <select aria-label={t('overrides.target')} value={target} onChange={(e) => setTarget(e.target.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <NumberInput aria-label={t('overrides.value')} value={value} onChange={(v) => setValue(Math.round(v))} />
        <input aria-label={t('overrides.reason')} placeholder={t('overrides.reasonPlaceholder')} value={reason} onChange={(e) => setReason(e.target.value)} />
        <button type="button" onClick={add}>
          {t('overrides.add')}
        </button>
      </div>
    </section>
  );
}

/** Spec §8: features per class, subclass, species and feats with their SRD text; placeholders for unfilled skeletons. */
export function FeaturesTab({ session }: { session: ReadySession }) {
  const { character, sheet } = session;
  const { registry } = useAppData();
  const { t } = useI18n();
  const chosen = new Set(character.choices.featureOptions);
  return (
    <div className="features-tab">
      <WarningList warnings={sheet.warnings} />
      {groupFeatures(sheet.features).map((group) => (
        <section key={group.key}>
          <div className="group-head">
            <h2>{group.title}</h2>
            {group.ownerId !== undefined && <BookLink contentIds={[group.ownerId]} label={group.title} />}
          </div>
          {group.features.map((feature) => {
            const picked = optionsFor(registry, feature.id).filter((o) => chosen.has(o.id));
            const hasOptions = optionsFor(registry, feature.id).length > 0;
            return (
              <details key={feature.id} className="feature">
                <summary>
                  <span className="feature-name">{feature.placeholder ? t('features.placeholder') : feature.name}</span>
                  {feature.level !== undefined && <span className="muted"> · Level {feature.level}</span>}
                  {hasOptions && (
                    <span className={picked.length > 0 ? 'muted' : 'warning'}> · {picked.length > 0 ? picked.map((o) => o.name).join(', ') : t('features.chooseOption')}</span>
                  )}
                </summary>
                {!feature.placeholder && (
                  <div className="feature-book">
                    <BookLink contentIds={[feature.id]} label={feature.name} />
                  </div>
                )}
                {feature.placeholder ? (
                  <p className="muted">{t('features.placeholderHelp')}</p>
                ) : (
                  plainParagraphs(feature.text).map((p, i) => (
                    <p key={i} className="rules-text">
                      {p}
                    </p>
                  ))
                )}
                {picked.map((o) => (
                  <p key={o.id} className="rules-text">
                    <strong>{o.name}.</strong> {plainParagraphs(o.text).join(' ')}
                  </p>
                ))}
              </details>
            );
          })}
        </section>
      ))}
      <BonusBreakdown session={session} />
      <OverridesEditor session={session} />
    </div>
  );
}
