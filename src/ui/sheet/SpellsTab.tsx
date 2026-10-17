import { useState } from 'react';
import type { Ability } from '../../content/constants';
import { useI18n } from '../../i18n/i18n';
import { useAppData } from '../data';
import { abilityName, formatMod, plainParagraphs } from '../format';
import type { ReadySession } from './session';
import { SpellSlots } from './SpellSlots';
import { addSpell, MAGIC_INITIATE_ABILITIES, MAGIC_INITIATE_LISTS, removeSpell, setPrepared, type SpellEntry } from './spell-logic';

type Indexed = { entry: SpellEntry; index: number };

function SpellList({ items, onPrepare, onRemove }: { items: Indexed[]; onPrepare: (index: number, on: boolean) => void; onRemove: (index: number) => void }) {
  const { registry } = useAppData();
  const { t } = useI18n();
  if (items.length === 0) return <p className="muted">{t('spells.none')}</p>;
  const levelOf = (item: Indexed) => registry.getOf('spell', item.entry.spellId)?.level ?? 99;
  return (
    <ul className="spell-list">
      {[...items].sort((a, b) => levelOf(a) - levelOf(b)).map(({ entry, index }) => {
        const spell = registry.getOf('spell', entry.spellId);
        const name = spell?.name ?? t('common.unknown', { id: entry.spellId });
        const tags = spell
          ? [spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`, spell.school, ...(spell.concentration ? ['Concentration'] : []), ...(spell.ritual ? ['Ritual'] : []), ...(entry.ability ? [abilityName(entry.ability)] : [])]
          : [];
        return (
          <li key={`${entry.classId}|${entry.spellId}|${entry.ability ?? ''}`} className="spell-row">
            {spell && spell.level > 0 && (
              <input type="checkbox" aria-label={t('spells.prepared', { name })} checked={entry.prepared} onChange={(e) => onPrepare(index, e.target.checked)} />
            )}
            <details>
              <summary>
                <span className="spell-name">{name}</span> <span className="muted">{tags.join(' · ')}</span>
              </summary>
              {spell && (
                <>
                  <p className="muted">
                    {spell.castingTime} · {spell.range} · {spell.components} · {spell.duration}
                  </p>
                  {plainParagraphs(spell.text).map((p, i) => (
                    <p key={i} className="rules-text">
                      {p}
                    </p>
                  ))}
                </>
              )}
            </details>
            <button type="button" aria-label={t('spells.remove', { name })} onClick={() => onRemove(index)}>
              ×
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function AddClassSpell({ classId, className, onAdd }: { classId: string; className: string; onAdd: (spellId: string) => void }) {
  const { registry } = useAppData();
  const { t } = useI18n();
  const [spellId, setSpellId] = useState('');
  const options = registry
    .list('spell')
    .filter((s) => s.classes.includes(classId))
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  return (
    <div className="row">
      <select aria-label={t('spells.addFor', { name: className })} value={spellId} onChange={(e) => setSpellId(e.target.value)}>
        <option value="">–</option>
        {options.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.level === 0 ? 'Cantrip' : `Level ${s.level}`})
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!spellId}
        onClick={() => {
          onAdd(spellId);
          setSpellId('');
        }}
      >
        {t('spells.add')}
      </button>
    </div>
  );
}

/** Magic Initiate: two cantrips and one level 1 spell from one list, with the ability chosen for the feat. */
function AddFeatSpell({ onAdd }: { onAdd: (entry: SpellEntry) => void }) {
  const { registry } = useAppData();
  const { t } = useI18n();
  const [listId, setListId] = useState(MAGIC_INITIATE_LISTS[0]);
  const [ability, setAbility] = useState<Ability>(MAGIC_INITIATE_ABILITIES[0]);
  const [spellId, setSpellId] = useState('');
  const options = registry
    .list('spell')
    .filter((s) => s.classes.includes(listId) && s.level <= 1)
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  return (
    <div className="row">
      <select
        aria-label={t('spells.list')}
        value={listId}
        onChange={(e) => {
          setListId(e.target.value);
          setSpellId('');
        }}
      >
        {MAGIC_INITIATE_LISTS.map((id) => (
          <option key={id} value={id}>
            {registry.get(id)?.name ?? id}
          </option>
        ))}
      </select>
      <select aria-label="Spellcasting ability" value={ability} onChange={(e) => setAbility(e.target.value as Ability)}>
        {MAGIC_INITIATE_ABILITIES.map((a) => (
          <option key={a} value={a}>
            {abilityName(a)}
          </option>
        ))}
      </select>
      <select aria-label="Spell" value={spellId} onChange={(e) => setSpellId(e.target.value)}>
        <option value="">–</option>
        {options.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.level === 0 ? 'Cantrip' : `Level ${s.level}`})
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!spellId}
        onClick={() => {
          onAdd({ classId: listId, spellId, prepared: true, ability });
          setSpellId('');
        }}
      >
        {t('spells.addFromFeat')}
      </button>
    </div>
  );
}

/** Spec §7: the spell slots, then casting ability, spell attack and save DC per class, prepared spells against the class table, spells from feats. */
export function SpellsTab({ session }: { session: ReadySession }) {
  const { character, sheet, commit } = session;
  const { registry } = useAppData();
  const { t } = useI18n();
  const spells = character.choices.spells;
  const setSpells = (next: SpellEntry[]) => commit({ ...character, choices: { ...character.choices, spells: next } });
  const indexed: Indexed[] = spells.map((entry, index) => ({ entry, index }));
  const casters = new Set(sheet.spellcasting.classes.map((c) => c.classId));
  const isCantrip = (spellId: string) => registry.getOf('spell', spellId)?.level === 0;
  const prepare = (index: number, on: boolean) => setSpells(setPrepared(spells, index, on));
  const remove = (index: number) => setSpells(removeSpell(spells, index));
  return (
    <div className="spells-tab">
      <SpellSlots session={session} />
      {sheet.spellcasting.classes.length === 0 && <p className="muted">{t('spells.noCaster')}</p>}
      {sheet.spellcasting.classes.map((c) => {
        const own = indexed.filter(({ entry }) => entry.classId === c.classId && !entry.ability);
        const cantrips = own.filter(({ entry }) => isCantrip(entry.spellId)).length;
        const prepared = own.filter(({ entry }) => entry.prepared && !isCantrip(entry.spellId)).length;
        return (
          <section key={c.classId} className="card">
            <h2>{c.name}</h2>
            <p>
              {abilityName(c.ability)} · Spell Attack {formatMod(c.attack)} · Spell Save DC {c.dc}
            </p>
            <p className="muted">
              Cantrips {cantrips}/{c.cantripsMax ?? '–'} · Prepared {prepared}/{c.preparedMax ?? '–'}
            </p>
            <SpellList items={own} onPrepare={prepare} onRemove={remove} />
            <AddClassSpell classId={c.classId} className={c.name} onAdd={(spellId) => setSpells(addSpell(spells, { classId: c.classId, spellId, prepared: true }))} />
          </section>
        );
      })}
      <section className="card">
        <h2>{t('spells.other')}</h2>
        <p className="muted">{t('spells.otherHelp')}</p>
        <SpellList items={indexed.filter(({ entry }) => entry.ability !== undefined || !casters.has(entry.classId))} onPrepare={prepare} onRemove={remove} />
        <AddFeatSpell onAdd={(entry) => setSpells(addSpell(spells, entry))} />
      </section>
    </div>
  );
}
