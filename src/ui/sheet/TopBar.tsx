import { useState } from 'react';
import { CONDITIONS } from '../../content/constants';
import { useI18n } from '../../i18n/i18n';
import {
  applyDamage, applyHealing, canRest, lifeState, recordDeathSave, setConditions, setDeathSaves, setExhaustion,
  setHeroicInspiration, setTempHp,
} from '../../rules/actions';
import { WarningList } from '../components/WarningList';
import { useDice } from '../dice/DiceContext';
import { classSummary, formatMod, titleCase } from '../format';
import { hrefFor } from '../router';
import { LongRestDialog, ShortRestDialog } from './RestDialogs';
import type { ReadySession } from './session';

function HitPoints({ session }: { session: ReadySession }) {
  const { character, sheet, commit } = session;
  const { t } = useI18n();
  const [amount, setAmount] = useState('');
  const [critical, setCritical] = useState(false);
  const value = Math.floor(Number(amount));
  const isNumber = amount.trim() !== '' && Number.isFinite(value) && value >= 0;
  // The actions themselves don't refuse a dead character (healing would revive), so the buttons do.
  const dead = lifeState(character, sheet) === 'dead';
  const done = () => {
    setAmount('');
    setCritical(false);
  };
  return (
    <div className="hp-control">
      <span className="hp-value" data-testid="hp">
        {sheet.hp.current}/{sheet.hp.max}
      </span>
      {sheet.hp.temp > 0 && <span className="muted">+{sheet.hp.temp} temp</span>}
      <input aria-label={t('sheet.amount')} type="number" inputMode="numeric" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
      <button
        type="button"
        className="big danger"
        disabled={dead || !isNumber || value === 0}
        onClick={() => {
          commit(applyDamage(character, value, sheet, { critical }), t('undo.damage', { amount: value }));
          done();
        }}
      >
        − {t('sheet.damage')}
      </button>
      <button
        type="button"
        className="big"
        disabled={dead || !isNumber || value === 0}
        onClick={() => {
          commit(applyHealing(character, value, sheet), t('undo.heal', { amount: value }));
          done();
        }}
      >
        + {t('sheet.heal')}
      </button>
      <button
        type="button"
        disabled={dead || !isNumber}
        onClick={() => {
          commit(setTempHp(character, value), t('undo.temp', { amount: value }));
          done();
        }}
      >
        {t('sheet.setTemp')}
      </button>
      {sheet.hp.current === 0 && sheet.hp.max > 0 && (
        <label className="option">
          <input type="checkbox" checked={critical} onChange={(e) => setCritical(e.target.checked)} />
          {t('sheet.criticalHit')}
        </label>
      )}
    </div>
  );
}

function DeathSaves({ session }: { session: ReadySession }) {
  const { character, sheet, commit } = session;
  const { t } = useI18n();
  const dice = useDice();
  const life = lifeState(character, sheet);
  if (life === 'alive') return null;
  const { successes, failures } = character.state.deathSaves;
  const dots = (n: number) => `${'●'.repeat(n)}${'○'.repeat(Math.max(0, 3 - n))}`;
  const roll = () => {
    const result = dice.rollD20('Death Saving Throw', -sheet.d20Penalty);
    commit(recordDeathSave(character, result.kept, sheet), t('undo.deathSave', { roll: result.kept }));
  };
  return (
    <div className={`death-saves ${life}`} role="group" aria-label="Death Saving Throws">
      <strong>{t(`life.${life}`)}</strong>
      <span>Successes {dots(successes)}</span>
      <span>Failures {dots(failures)}</span>
      {life === 'dying' && (
        <button type="button" onClick={roll}>
          {t('sheet.rollDeathSave')}
        </button>
      )}
      <button type="button" onClick={() => commit(setDeathSaves(character, 0, 0), t('undo.deathSavesReset'))}>
        {t('sheet.resetDeathSaves')}
      </button>
    </div>
  );
}

function Conditions({ session }: { session: ReadySession }) {
  const { character, commit } = session;
  const { t } = useI18n();
  const { conditions, exhaustion, heroicInspiration } = character.state;
  return (
    <div className="row conditions">
      {conditions.map((c) => (
        <button
          key={c}
          type="button"
          className="chip"
          aria-label={t('sheet.removeCondition', { name: titleCase(c) })}
          onClick={() => commit(setConditions(character, conditions.filter((x) => x !== c)), t('undo.conditionOff', { name: titleCase(c) }))}
        >
          {titleCase(c)} ×
        </button>
      ))}
      <select
        aria-label={t('sheet.addCondition')}
        value=""
        onChange={(e) => {
          const c = e.target.value;
          if (c) commit(setConditions(character, [...conditions, c]), t('undo.conditionOn', { name: titleCase(c) }));
        }}
      >
        <option value="">{t('sheet.addCondition')}</option>
        {CONDITIONS.filter((c) => !conditions.includes(c)).map((c) => (
          <option key={c} value={c}>
            {titleCase(c)}
          </option>
        ))}
      </select>
      <span className="row">
        Exhaustion
        <button type="button" aria-label="Exhaustion −1" disabled={exhaustion === 0} onClick={() => commit(setExhaustion(character, exhaustion - 1), `Exhaustion ${exhaustion - 1}`)}>
          −
        </button>
        <strong>{exhaustion}</strong>
        <button type="button" aria-label="Exhaustion +1" disabled={exhaustion >= 6} onClick={() => commit(setExhaustion(character, exhaustion + 1), `Exhaustion ${exhaustion + 1}`)}>
          +
        </button>
      </span>
      <label className="option">
        <input type="checkbox" checked={heroicInspiration} onChange={(e) => commit(setHeroicInspiration(character, e.target.checked), 'Heroic Inspiration')} />
        Heroic Inspiration
      </label>
    </div>
  );
}

function Rests({ session }: { session: ReadySession }) {
  const { t } = useI18n();
  const [dialog, setDialog] = useState<'short' | 'long' | null>(null);
  const allowed = canRest(session.sheet);
  // A dead character cannot rest either; the rest actions only check the hit points.
  const blocked = !allowed || lifeState(session.character, session.sheet) === 'dead';
  return (
    <div className="row">
      <button type="button" disabled={blocked} onClick={() => setDialog('short')}>
        Short Rest
      </button>
      <button type="button" disabled={blocked} onClick={() => setDialog('long')}>
        Long Rest
      </button>
      {!allowed && <span className="muted">{t('rest.needsHp')}</span>}
      <span className="muted">
        Hit Point Dice: {session.sheet.hitDice.map((hd) => `d${hd.die} ${hd.total - hd.spent}/${hd.total}`).join(' · ') || '–'}
      </span>
      {dialog === 'short' && <ShortRestDialog session={session} onClose={() => setDialog(null)} />}
      {dialog === 'long' && <LongRestDialog session={session} onClose={() => setDialog(null)} />}
    </div>
  );
}

/**
 * The dice mode lives above the router, so a forgotten Advantage, Disadvantage or Critical would silently change a later
 * roll on any sheet. These chips show what is set and clear it with a tap.
 */
function DiceSettings() {
  const { t } = useI18n();
  const dice = useDice();
  return (
    <>
      {dice.mode !== 'normal' && (
        <button type="button" className="chip" aria-pressed="true" onClick={() => dice.setMode('normal')}>
          {dice.mode === 'advantage' ? 'Advantage' : 'Disadvantage'}
        </button>
      )}
      {dice.critical && (
        <button type="button" className="chip" aria-pressed="true" onClick={() => dice.setCritical(false)}>
          {t('dice.critical')}
        </button>
      )}
    </>
  );
}

/** Spec §8: the fixed bar with name and classes, HP with big buttons and temp HP, AC, Initiative, conditions, rests and dice. */
export function TopBar({ session }: { session: ReadySession }) {
  const { character, sheet } = session;
  const { t } = useI18n();
  const dice = useDice();
  return (
    <header className="top-bar">
      <div className="row top-row">
        <a className="button" href={hrefFor({ name: 'list' })} aria-label={t('nav.back')}>
          ←
        </a>
        <div className="identity">
          <h1>{character.name || t('common.unnamed')}</h1>
          <span className="muted">
            {classSummary(sheet) || '–'} · Level {sheet.totalLevel}
          </span>
        </div>
        <button type="button" aria-label={t('undo.last')} disabled={!session.canUndo} onClick={session.undo}>
          ↶
        </button>
        <button type="button" aria-label={t('dice.open')} onClick={() => dice.setOpen(!dice.open)}>
          ⚄
        </button>
        <DiceSettings />
        <a className="button" href={hrefFor({ name: 'edit', id: character.id })}>
          {t('sheet.edit')}
        </a>
      </div>
      <div className="row top-row">
        <HitPoints session={session} />
        <div className="stat" title={sheet.ac.source}>
          <span>AC</span>
          <strong data-testid="ac">{sheet.ac.value}</strong>
        </div>
        <button type="button" className="stat" onClick={() => dice.rollD20('Initiative', sheet.initiative)}>
          <span>Initiative</span>{' '}
          <strong>{formatMod(sheet.initiative)}</strong>
        </button>
        <div className="stat">
          <span>Speed</span>
          <strong>{sheet.speed} ft.</strong>
        </div>
        <div className="stat">
          <span>Proficiency Bonus</span>
          <strong>{formatMod(sheet.proficiencyBonus)}</strong>
        </div>
      </div>
      <DeathSaves session={session} />
      <Conditions session={session} />
      <Rests session={session} />
      <WarningList warnings={sheet.warnings} />
    </header>
  );
}
