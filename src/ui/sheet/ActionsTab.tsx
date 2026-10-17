import { useI18n } from '../../i18n/i18n';
import { setResourceUsed } from '../../rules/actions';
import { useDice } from '../dice/DiceContext';
import { formatMod } from '../format';
import type { ReadySession } from './session';
import { playColumns } from './spell-logic';

/** Spec §8: attacks and resources, plus the class table values for this level. The spell slots live with the spells. */
export function ActionsTab({ session }: { session: ReadySession }) {
  const { character, sheet, commit } = session;
  const { t } = useI18n();
  const dice = useDice();
  const columns = playColumns(sheet);
  return (
    <div className="actions-tab">
      <section>
        <h2>{t('actions.attacks')}</h2>
        {sheet.attacks.length === 0 ? (
          <p className="muted">{t('actions.noAttacks')}</p>
        ) : (
          <ul className="attack-list">
            {sheet.attacks.map((a, index) => (
              // The id alone can repeat: a class cantrip and the same cantrip from Magic Initiate (same list) share one id.
              <li key={`${a.id}-${index}`} className="attack">
                <span className="attack-name">
                  {a.name}
                  {!a.proficient && <span className="muted"> ({t('actions.notProficient')})</span>}
                </span>
                {a.toHit !== undefined ? (
                  <button type="button" aria-label={`${a.name}: attack ${formatMod(a.toHit)}`} onClick={() => dice.rollD20(`${a.name}: attack`, a.toHit!)}>
                    {formatMod(a.toHit)}
                  </button>
                ) : (
                  <span>{a.saveDC !== undefined ? `DC ${a.saveDC}${a.saveAbility ? ` ${a.saveAbility.toUpperCase()}` : ''}` : '–'}</span>
                )}
                <button type="button" aria-label={`${a.name}: damage ${a.damage}`} onClick={() => dice.roll(`${a.name}: damage`, a.damage, { damage: true })}>
                  {a.damage} {a.damageType}
                </button>
                <span className="muted">{[...a.properties, ...(a.mastery ? [`Mastery: ${a.mastery}`] : [])].join(', ')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {columns.length > 0 && (
        <section>
          <h2>{t('actions.classTable')}</h2>
          <dl className="columns">
            {columns.map((c) => (
              <div key={c.key}>
                <dt>{c.label}</dt>
                <dd>{c.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {sheet.resources.length > 0 && (
        <section>
          <h2>{t('actions.resources')}</h2>
          <ul className="resource-list">
            {sheet.resources.map((r) => {
              const left = r.max - r.used;
              return (
                <li key={r.key} className="row resource">
                  <span className="resource-name">
                    {r.name} <span className="muted">({r.recharge === 'short' ? 'Short Rest' : 'Long Rest'})</span>
                  </span>
                  <button type="button" aria-label={t('actions.use', { name: r.name })} disabled={left === 0} onClick={() => commit(setResourceUsed(character, r.key, r.used + 1, sheet), `${r.name} ${left - 1}/${r.max}`)}>
                    −
                  </button>
                  <strong>
                    {left}/{r.max}
                  </strong>
                  <button type="button" aria-label={t('actions.regain', { name: r.name })} disabled={r.used === 0} onClick={() => commit(setResourceUsed(character, r.key, r.used - 1, sheet), `${r.name} ${left + 1}/${r.max}`)}>
                    +
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
