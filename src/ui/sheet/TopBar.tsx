import { useState, type CSSProperties, type ReactNode } from 'react';
import { CONDITIONS } from '../../content/constants';
import { useI18n } from '../../i18n/i18n';
import {
  applyDamage, applyHealing, applyInitiativeRefills, canRest, concentrationDC, initiativeChoices, lifeState, recordDeathSave, setConcentration, setConditions, setDeathSaves,
  setExhaustion, setHeroicInspiration, setTempHp, takeInitiativeRefill,
} from '../../rules/actions';
import { useToast } from '../components/Toast';
import { WarningList } from '../components/WarningList';
import { useAppData } from '../data';
import { useDice } from '../dice/DiceContext';
import { classSummary, formatMod, titleCase } from '../format';
import { hrefFor } from '../router';
import { LongRestDialog, ShortRestDialog } from './RestDialogs';
import type { ReadySession } from './session';
import { StoryDialog } from './StoryDialog';

/** `onDamage` gets the damage taken, so a Concentration save can be offered right after. */
function HitPoints({ session, onDamage }: { session: ReadySession; onDamage: (amount: number) => void }) {
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
  // A change of current HP (damage, healing, a rest, an undo) briefly colours the number, so the table sees which way it went.
  const current = sheet.hp.current;
  const [previous, setPrevious] = useState(current);
  const [flash, setFlash] = useState<{ direction: 'down' | 'up' | null; n: number }>({ direction: null, n: 0 });
  if (current !== previous) {
    setPrevious(current);
    setFlash((f) => ({ direction: current < previous ? 'down' : 'up', n: f.n + 1 }));
  }
  return (
    <>
      <LifeFlask current={current} max={sheet.hp.max} temp={sheet.hp.temp}>
        <span key={flash.n} className={flash.direction ? `hp-value hp-${flash.direction}` : 'hp-value'} data-testid="hp">
          <b>{current}</b>
          <span className="hp-max">/{sheet.hp.max}</span>
        </span>
      </LifeFlask>
      <div className="hp-control">
        <input aria-label={t('sheet.amount')} type="number" inputMode="numeric" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button
          type="button"
          className="big danger"
          disabled={dead || !isNumber || value === 0}
          onClick={() => {
            commit(applyDamage(character, value, sheet, { critical }), t('undo.damage', { amount: value }));
            onDamage(value);
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
    </>
  );
}

/** A share of max HP as a CSS length for the liquid; a character without max HP shows an empty flask. */
const share = (n: number, max: number) => `${max > 0 ? Math.round((Math.min(Math.max(n, 0), max) / max) * 100) : 0}%`;

/**
 * Hit points as a glass flask: red is current HP, a gold layer above it is temp HP. The liquid sinks and rises with
 * every change; an empty flask shows a crack. The number inside is the child, so the HP text stays one element.
 */
function LifeFlask({ current, max, temp, children }: { current: number; max: number; temp: number; children: ReactNode }) {
  const style = { '--hp': share(current, max), '--temp': share(temp, max) } as CSSProperties;
  return (
    <div className="flask-wrap">
      <div className="flask" style={style}>
        <div className="cork" />
        <div className="neck" />
        <div className="bulb">
          {temp > 0 && <div className="temp" />}
          <div className="life" />
          {children}
          {current === 0 && max > 0 && (
            <svg className="crack" viewBox="0 0 100 100" aria-hidden="true">
              <path d="M70 6 L60 26 L70 36 L54 58 L62 70 M60 26 L48 31" />
            </svg>
          )}
        </div>
      </div>
      {temp > 0 && <span className="flask-label">+{temp} temp</span>}
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
  const roll = async () => {
    const result = await dice.rollD20('Death Saving Throw', -sheet.d20Penalty);
    if (!result) return;
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

/**
 * SRD Concentration: the spell held, a Constitution save after damage (DC 10 or half the damage, at most 30) and a
 * tap to end it. A failed save ends Concentration with an Undo, so a wrong roll can be taken back.
 */
function Concentration({ session, damage, onDone }: { session: ReadySession; damage?: number; onDone: () => void }) {
  const { character, sheet, commit } = session;
  const { registry } = useAppData();
  const { t } = useI18n();
  const dice = useDice();
  const toast = useToast();
  const spellId = character.state.concentration;
  if (!spellId) return null;
  const name = registry.getOf('spell', spellId)?.name ?? spellId;
  const dc = damage !== undefined ? concentrationDC(damage) : undefined;
  const save = async () => {
    if (dc === undefined) return;
    const result = await dice.rollD20('Concentration (Con save)', sheet.saves.con.bonus);
    if (!result) return;
    onDone();
    if (result.total >= dc) toast({ message: t('concentration.kept', { total: result.total, dc }) });
    else commit(setConcentration(character, undefined), t('undo.concentrationLost', { name, total: result.total, dc }));
  };
  return (
    <div className="concentration row" role="group" aria-label={t('concentration.label')}>
      <strong>{t('concentration.label')}</strong>
      <span>{name}</span>
      {dc !== undefined && (
        <button type="button" className="danger" onClick={save}>
          {t('concentration.save', { dc })}
        </button>
      )}
      <button
        type="button"
        aria-label={t('concentration.end')}
        onClick={() => {
          onDone();
          commit(setConcentration(character, undefined), t('undo.concentrationOff', { name }));
        }}
      >
        ×
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

/** Hit point dice left per die size, "d8 2/3", as the Short Rest spends them. */
const hitDiceText = (sheet: ReadySession['sheet']) => sheet.hitDice.map((hd) => `d${hd.die} ${hd.total - hd.spent}/${hd.total}`).join(' · ') || '–';

/**
 * The portrait in a round gold frame beside the name, with the faction symbol as a small seal on its rim; a tap opens
 * the story, where both are shown large. Without any picture there is no medallion.
 */
function Medallion({ details, name, onOpen }: { details: ReadySession['character']['details']; name: string; onOpen: () => void }) {
  const { t } = useI18n();
  const main = details.portrait ?? details.factionSymbol;
  if (!main) return null;
  const seal = details.portrait ? details.factionSymbol : undefined;
  return (
    <button type="button" className="medallion" aria-label={t('sheet.portrait', { name })} onClick={onOpen}>
      <img src={main} alt="" />
      {seal && <img className="medallion-seal" src={seal} alt="" />}
    </button>
  );
}

/** Spec §8: name and classes, HP as the life flask with big buttons, and the numbers you call out at the table. */
export function TopBar({ session }: { session: ReadySession }) {
  const { character, sheet } = session;
  const { t } = useI18n();
  const dice = useDice();
  const { registry } = useAppData();
  const dcs = [...new Set(sheet.spellcasting.classes.map((c) => c.dc))];
  const [storyOpen, setStoryOpen] = useState(false);
  const toast = useToast();
  // Rolling Initiative refills what needs no choice, then offers a refill that costs a use (Persistent Rage).
  const rollInitiative = async () => {
    const result = await dice.rollD20('Initiative', sheet.initiative);
    if (!result) return;
    const label = refillLabel();
    if (label) session.apply((current, now) => applyInitiativeRefills(current, now).character, label);
    const choice = initiativeChoices(sheet)[0];
    if (choice) {
      toast({
        message: t('initiative.choice', { name: choice.name }),
        action: { label: t('initiative.use'), run: () => session.apply((current, now) => takeInitiativeRefill(current, now, choice.costKey), t('undo.initiativeChoice', { name: choice.name })) },
      });
    }
  };
  const refillLabel = () => {
    const { refilled } = applyInitiativeRefills(character, sheet);
    return refilled.length > 0 ? t('undo.initiativeRefill', { list: refilled.join(', ') }) : undefined;
  };
  // The last damage taken while concentrating, until the save is rolled or Concentration ends.
  const [damage, setDamage] = useState<number>();
  const { speciesId, backgroundId } = character.choices;
  const origin = [
    speciesId ? registry.getOf('species', speciesId)?.name : undefined,
    backgroundId ? registry.getOf('background', backgroundId)?.name : undefined,
    character.details.alignment,
    character.details.xp ? t('sheet.xp', { xp: character.details.xp }) : undefined,
  ].filter((part): part is string => !!part && part.trim() !== '');
  return (
    <header className="top-bar card">
      <div className="row top-row">
        <a className="button" href={hrefFor({ name: 'list' })} aria-label={t('nav.back')}>
          ←
        </a>
        <Medallion details={character.details} name={character.name || t('common.unnamed')} onOpen={() => setStoryOpen(true)} />
        <div className="identity">
          <h1>{character.name || t('common.unnamed')}</h1>
          <span className="muted">
            {classSummary(sheet) || '–'} · Level {sheet.totalLevel}
          </span>
          {origin.length > 0 && <span className="muted origin">{origin.join(' · ')}</span>}
        </div>
        <button type="button" aria-label={t('undo.last')} disabled={!session.canUndo} onClick={session.undo}>
          ↶
        </button>
        <button type="button" aria-label={t('dice.open')} onClick={() => dice.setOpen(!dice.open)}>
          ⚄
        </button>
        <DiceSettings />
        <button type="button" className="story-button" onClick={() => setStoryOpen(true)}>
          {t('sheet.story')}
        </button>
        <a className="button" href={hrefFor({ name: 'edit', id: character.id })}>
          {t('sheet.edit')}
        </a>
      </div>
      {storyOpen && <StoryDialog session={session} onClose={() => setStoryOpen(false)} />}
      <div className="head-main">
        <HitPoints session={session} onDamage={(amount) => setDamage(character.state.concentration ? amount : undefined)} />
        <div className="vitals">
          <div className="stat" title={sheet.ac.source}>
            <span>AC</span>
            <strong data-testid="ac">{sheet.ac.value}</strong>
          </div>
          <button type="button" className="stat" onClick={rollInitiative}>
            <span>Initiative</span>{' '}
            <strong>{formatMod(sheet.initiative)}</strong>
          </button>
          <div className="stat">
            <span>Speed</span>
            <strong>{sheet.speed} ft.</strong>
          </div>
          <div className="stat">
            <span>Proficiency</span>
            <strong>{formatMod(sheet.proficiencyBonus)}</strong>
          </div>
          {dcs.length > 0 && (
            <div className="stat">
              <span>Spell DC</span>
              <strong>{dcs.join(' / ')}</strong>
            </div>
          )}
          <div className="stat">
            <span>Hit Dice</span>
            <strong>{hitDiceText(sheet)}</strong>
          </div>
        </div>
      </div>
      <Concentration session={session} damage={damage} onDone={() => setDamage(undefined)} />
      <DeathSaves session={session} />
      <WarningList warnings={sheet.warnings} />
    </header>
  );
}

/** Conditions, Exhaustion, Heroic Inspiration and the rests: what changes between fights rather than during one. */
export function RestBar({ session }: { session: ReadySession }) {
  return (
    <div className="rest-bar card">
      <Rests session={session} />
      <Conditions session={session} />
    </div>
  );
}
