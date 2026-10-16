import { useState } from 'react';
import type { ContentItem } from '../../content/schema';
import { useI18n } from '../../i18n/i18n';
import type { Character, InventoryItem } from '../../model/character';
import { Dialog } from '../components/Dialog';
import { NumberInput } from '../components/NumberInput';
import { useAppData } from '../data';
import { MAX_ATTUNED, newItem, removeItem, setCoin, setQty, updateItem } from './inventory-logic';
import type { ReadySession } from './session';

const TYPE_LABELS: Partial<Record<ContentItem['type'], string>> = { weapon: 'Weapon', armor: 'Armor', gear: 'Gear', 'magic-item': 'Magic Item' };
const COINS: Array<keyof Character['currency']> = ['cp', 'sp', 'ep', 'gp', 'pp'];

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
                <tr key={entry.id}>
                  <td>
                    {name}
                    {def?.type === 'magic-item' && <span className="muted"> · {def.rarity}</span>}
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
