import { useState } from 'react';
import type { D20Mode } from '../../dice/dice';
import { useI18n } from '../../i18n/i18n';
import { useDice } from './DiceContext';
import './dice.css';

const MODES: D20Mode[] = ['normal', 'advantage', 'disadvantage'];
const QUICK_DICE = [4, 6, 8, 10, 12, 20, 100];

/** Spec §10: the result at the bottom with the single dice, Advantage/Disadvantage, Critical, free rolls and the last 20 rolls. */
export function DicePanel() {
  const dice = useDice();
  const { t } = useI18n();
  const [expression, setExpression] = useState('');
  const latest = dice.history[0];
  return (
    <aside className="dice-panel" aria-label={t('dice.title')}>
      <button type="button" className="dice-latest" aria-expanded={dice.open} onClick={() => dice.setOpen(!dice.open)}>
        {latest ? (
          <>
            <strong className={latest.natural20 ? 'nat20' : latest.natural1 ? 'nat1' : undefined}>{latest.total}</strong>
            <span>{latest.label}</span>
            <span className="muted">{latest.detail}</span>
          </>
        ) : (
          t('dice.title')
        )}
      </button>
      {dice.open && (
        <div className="dice-body">
          <div className="row" role="group" aria-label={t('dice.mode')}>
            {MODES.map((m) => (
              <button key={m} type="button" aria-pressed={dice.mode === m} onClick={() => dice.setMode(m)}>
                {m === 'normal' ? t('dice.normal') : m === 'advantage' ? 'Advantage' : 'Disadvantage'}
              </button>
            ))}
            <button type="button" aria-pressed={dice.critical} onClick={() => dice.setCritical(!dice.critical)}>
              {t('dice.critical')}
            </button>
          </div>
          <form
            className="row"
            onSubmit={(event) => {
              event.preventDefault();
              const text = expression.trim();
              if (text && dice.roll(text, text)) setExpression('');
            }}
          >
            <input aria-label={t('dice.expression')} placeholder="2d6+3" value={expression} onChange={(e) => setExpression(e.target.value)} />
            <button type="submit">{t('dice.roll')}</button>
          </form>
          <div className="row">
            {QUICK_DICE.map((sides) => (
              <button key={sides} type="button" onClick={() => dice.roll(`d${sides}`, `1d${sides}`)}>
                d{sides}
              </button>
            ))}
          </div>
          <ol className="dice-history" aria-label={t('dice.history')}>
            {dice.history.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.total}</strong> {entry.label} <span className="muted">{entry.detail}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </aside>
  );
}
