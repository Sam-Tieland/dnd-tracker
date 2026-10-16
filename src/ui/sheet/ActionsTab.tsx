import { useI18n } from '../../i18n/i18n';
import { setPactSlotsUsed, setResourceUsed, setSlotsUsed } from '../../rules/actions';
import { useDice } from '../dice/DiceContext';
import { formatMod } from '../format';
import type { ReadySession } from './session';
import { playColumns } from './spell-logic';

function Slots({ session }: { session: ReadySession }) {
  const { character, sheet, commit } = session;
  const { t } = useI18n();
  const { slots, pact } = sheet.spellcasting;
  if (slots.length === 0 && !pact) return null;
  const boxes = (level: number, max: number, used: number, set: (used: number) => void) =>
    Array.from({ length: max }, (_, i) => (
      <button
        key={i}
        type="button"
        className={i < used ? 'slot used' : 'slot'}
        aria-pressed={i < used}
        aria-label={t('slots.slot', { level, n: i + 1 })}
        onClick={() => set(i < used ? i : i + 1)}
      />
    ));
  return (
    <section>
      <h2>Spell Slots</h2>
      {slots.map((s) => (
        <div key={s.level} className="row slot-row">
          <span>Level {s.level}</span>
          {boxes(s.level, s.max, s.used, (used) => commit(setSlotsUsed(character, s.level, used, sheet), t('undo.slots', { level: s.level, left: s.max - used, max: s.max })))}
        </div>
      ))}
      {pact && (
        <div className="row slot-row">
          <span>Pact Magic (Level {pact.slotLevel})</span>
          {boxes(pact.slotLevel, pact.slots, pact.used, (used) => commit(setPactSlotsUsed(character, used, sheet), `Pact Magic: ${pact.slots - used}/${pact.slots}`))}
        </div>
      )}
    </section>
  );
}

/** Spec §8: attacks, resources and spell slots, plus the class table values for this level. */
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
      <Slots session={session} />
    </div>
  );
}
