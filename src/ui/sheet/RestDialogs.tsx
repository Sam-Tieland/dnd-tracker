import { useState } from 'react';
import { useI18n } from '../../i18n/i18n';
import { longRest, shortRest, type HitDieRoll } from '../../rules/actions';
import { Dialog } from '../components/Dialog';
import { useDice } from '../dice/DiceContext';
import type { ReadySession } from './session';

/** The player picks the Hit Point Dice; each chosen die is rolled in the dice panel and only those dice count. */
export function ShortRestDialog({ session, onClose }: { session: ReadySession; onClose: () => void }) {
  const { character, sheet, commit } = session;
  const { t } = useI18n();
  const dice = useDice();
  const [spend, setSpend] = useState<Record<number, number>>({});
  const confirm = () => {
    const rolls: HitDieRoll[] = [];
    for (const hd of sheet.hitDice) {
      for (let i = 0; i < (spend[hd.die] ?? 0); i += 1) {
        const result = dice.roll(`Hit Point Die (d${hd.die})`, `1d${hd.die}`);
        if (result) rolls.push({ die: hd.die, roll: result.total });
      }
    }
    const next = shortRest(character, sheet, { rolls });
    commit(next, t('undo.shortRest', { hp: next.state.hpCurrent - sheet.hp.current }));
    onClose();
  };
  return (
    <Dialog
      title="Short Rest"
      onClose={onClose}
      actions={
        <button type="button" className="primary" onClick={confirm}>
          {t('rest.takeShort')}
        </button>
      }
    >
      <p>{t('rest.shortHelp')}</p>
      {sheet.hitDice.map((hd) => {
        const left = hd.total - hd.spent;
        const count = spend[hd.die] ?? 0;
        return (
          <div key={hd.die} className="row">
            <span>
              d{hd.die}: {t('rest.diceLeft', { left, total: hd.total })}
            </span>
            <button type="button" aria-label={t('rest.fewer', { die: hd.die })} disabled={count === 0} onClick={() => setSpend({ ...spend, [hd.die]: count - 1 })}>
              −
            </button>
            <strong>{count}</strong>
            <button type="button" aria-label={t('rest.more', { die: hd.die })} disabled={count >= left} onClick={() => setSpend({ ...spend, [hd.die]: count + 1 })}>
              +
            </button>
          </div>
        );
      })}
    </Dialog>
  );
}

export function LongRestDialog({ session, onClose }: { session: ReadySession; onClose: () => void }) {
  const { character, sheet, commit } = session;
  const { t } = useI18n();
  return (
    <Dialog
      title="Long Rest"
      onClose={onClose}
      actions={
        <button
          type="button"
          className="primary"
          onClick={() => {
            commit(longRest(character, sheet), 'Long Rest');
            onClose();
          }}
        >
          {t('rest.takeLong')}
        </button>
      }
    >
      <p>{t('rest.longHelp')}</p>
    </Dialog>
  );
}
