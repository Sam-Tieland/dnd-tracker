import { Fragment, useState } from 'react';
import type { ContentItem } from '../../content/schema';
import { useI18n } from '../../i18n/i18n';
import type { Character, InventoryItem } from '../../model/character';
import { Dialog } from '../components/Dialog';
import { NumberInput } from '../components/NumberInput';
import { useAppData } from '../data';
import { plainParagraphs } from '../format';
import { MAX_ATTUNED, newItem, removeItem, setCoin, setQty, updateItem } from './inventory-logic';
import type { ReadySession } from './session';

const TYPE_LABELS: Partial<Record<ContentItem['type'], string>> = { weapon: 'Weapon', armor: 'Armor', gear: 'Gear', 'magic-item': 'Magic Item' };
const COINS: Array<keyof Character['currency']> = ['cp', 'sp', 'ep', 'gp', 'pp'];

/** The rules of an item as short lines: weapon and armor numbers, or the text of gear and magic items. */
function itemRules(def: ContentItem | undefined): string[] {
  if (!def) return [];
  if (def.type === 'weapon') {
    return [[`${def.damageDice} ${def.damageType}`, ...def.properties, `Mastery: ${def.mastery}`, def.weight].filter(Boolean).join(' · ')];
  }
  if (def.type === 'armor') {
    const dex = def.category === 'heavy' || def.category === 'shield' ? '' : def.dexCap === null ? ' + Dex modifier' : ` + Dex modifier (max ${def.dexCap})`;
    const ac = def.category === 'shield' ? `+${def.baseAC} AC` : `AC ${def.baseAC}${dex}`;
    return [[ac, def.strength ? `Str ${def.strength}` : '', def.stealthDisadvantage ? 'Stealth Disadvantage' : '', def.weight].filter(Boolean).join(' · ')];
  }
  if (def.type === 'magic-item') return [def.typeLine, ...plainParagraphs(def.text)];
  if (def.type === 'gear') return plainParagraphs(def.text);
  return [];
}

function AddItem({ onAdd }: { onAdd: (item: InventoryItem) => void }) {
  const { registry } = useAppData();
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const text = query.trim();
  const items = [...registry.list('weapon'), ...registry.list('armor'), ...registry.list('gear'), ...registry.list('magic-item')];
  const matches = text.length < 2 ? [] : items.filter((i) => i.name.toLowerCase().includes(text.toLowerCase())).slice(0, 20);
  const add = (entry: Omit<InventoryItem, 'id'>) => {
    onAdd(newItem(entry));
    setQuery('');
  };
  return (
    <section className="add-item">
      <input aria-label={t('inventory.search')} placeholder={t('inventory.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
      {matches.length > 0 && (
        <ul className="matches">
          {matches.map((i) => (
            <li key={i.id}>
              <button type="button" aria-label={`${i.name} (${TYPE_LABELS[i.type]})`} onClick={() => add({ itemId: i.id, qty: 1, equipped: false, attuned: false })}>
                {i.name} <span className="muted">{TYPE_LABELS[i.type]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {text && (
        <button type="button" onClick={() => add({ customName: text, qty: 1, equipped: false, attuned: false })}>
          {t('inventory.addCustom', { name: text })}
        </button>
      )}
    </section>
  );
}

/** Spec §8: inventory, coins and attunement. Equipping armor or a weapon changes AC and attacks right away. */
export function InventoryTab({ session }: { session: ReadySession }) {
  const { character, commit } = session;
  const { registry } = useAppData();
  const { t } = useI18n();
  const [toRemove, setToRemove] = useState<{ id: string; name: string }>();
  const [open, setOpen] = useState<string>();
  const setInventory = (inventory: InventoryItem[]) => commit({ ...character, inventory });
  const attuned = character.inventory.filter((i) => i.attuned).length;
  return (
    <div className="inventory-tab">
      <AddItem onAdd={(item) => setInventory([...character.inventory, item])} />
      {attuned > MAX_ATTUNED && <p className="warning">{t('inventory.tooManyAttuned', { count: attuned, max: MAX_ATTUNED })}</p>}
      {character.inventory.length === 0 ? (
        <p className="muted">{t('inventory.empty')}</p>
      ) : (
        <table className="inventory">
          <thead>
            <tr>
              <th>{t('inventory.item')}</th>
              <th>{t('inventory.qtyHeader')}</th>
              <th>{t('inventory.equippedHeader')}</th>
              <th>{t('inventory.attunedHeader')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {character.inventory.map((entry) => {
              const def = entry.itemId ? registry.get(entry.itemId) : undefined;
              const name = entry.customName || def?.name || t('common.unknown', { id: entry.itemId ?? entry.id });
              const equippable = def?.type === 'weapon' || def?.type === 'armor';
              const attunable = def?.type === 'magic-item' && def.attunement;
              return (
                <Fragment key={entry.id}>
                  <tr>
                    <td>
                      <button type="button" className="item-name" aria-expanded={open === entry.id} onClick={() => setOpen(open === entry.id ? undefined : entry.id)}>
                        {name}
                        {def?.type === 'magic-item' && <span className="muted"> · {def.rarity}</span>}
                        {entry.notes && <span className="muted"> · {entry.notes.split(/\r?\n/)[0]}</span>}
                      </button>
                    </td>
                    <td>
                      <NumberInput aria-label={t('inventory.qty', { name })} min={0} value={entry.qty} onChange={(qty) => setInventory(setQty(character.inventory, entry.id, qty))} />
                    </td>
                    <td>
                      {equippable && (
                        <input type="checkbox" aria-label={t('inventory.equipped', { name })} checked={entry.equipped} onChange={(e) => setInventory(updateItem(character.inventory, entry.id, { equipped: e.target.checked }))} />
                      )}
                    </td>
                    <td>
                      {attunable && (
                        <input type="checkbox" aria-label={t('inventory.attuned', { name })} checked={entry.attuned} onChange={(e) => setInventory(updateItem(character.inventory, entry.id, { attuned: e.target.checked }))} />
                      )}
                    </td>
                    <td>
                      <button type="button" aria-label={t('inventory.remove', { name })} onClick={() => setToRemove({ id: entry.id, name })}>
                        ×
                      </button>
                    </td>
                  </tr>
                  {open === entry.id && (
                    // The rules, the name and the notes get the full width of the table, below the item's own row.
                    <tr className="item-details">
                      <td colSpan={5}>
                        {itemRules(def).map((line, i) => (
                          <p key={i} className="rules-text">
                            {line}
                          </p>
                        ))}
                        <label>
                          {t('inventory.name')}
                          <input
                            aria-label={t('inventory.rename', { name })}
                            placeholder={def?.name}
                            value={entry.customName ?? ''}
                            onChange={(e) => setInventory(updateItem(character.inventory, entry.id, { customName: e.target.value || undefined }))}
                          />
                        </label>
                        <label>
                          {t('inventory.notes')}
                          <textarea
                            aria-label={t('inventory.notesFor', { name })}
                            rows={2}
                            value={entry.notes ?? ''}
                            onChange={(e) => setInventory(updateItem(character.inventory, entry.id, { notes: e.target.value || undefined }))}
                          />
                        </label>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
      <section>
        <h2>{t('inventory.currency')}</h2>
        <div className="row coins">
          {COINS.map((coin) => (
            <label key={coin}>
              {coin.toUpperCase()}
              <NumberInput min={0} value={character.currency[coin]} onChange={(value) => commit({ ...character, currency: setCoin(character.currency, coin, value) })} />
            </label>
          ))}
        </div>
      </section>
      {toRemove && (
        <Dialog
          title={t('inventory.removeTitle')}
          onClose={() => setToRemove(undefined)}
          actions={
            <button
              type="button"
              className="danger"
              onClick={() => {
                setInventory(removeItem(character.inventory, toRemove.id));
                setToRemove(undefined);
              }}
            >
              {t('common.delete')}
            </button>
          }
        >
          <p>{t('inventory.removeConfirm', { name: toRemove.name })}</p>
        </Dialog>
      )}
    </div>
  );
}
