import type { Character, InventoryItem } from '../../model/character';

/** SRD Equipment, Attunement: no more than three magic items at a time. */
export const MAX_ATTUNED = 3;

type Currency = Character['currency'];

/** crypto.randomUUID() ids fit attack:<id> and damage:<id> (Task 4). */
export function newItem(entry: Omit<InventoryItem, 'id'>, id: string = crypto.randomUUID()): InventoryItem {
  return { id, ...entry };
}

export function updateItem(items: readonly InventoryItem[], id: string, patch: Partial<Omit<InventoryItem, 'id'>>): InventoryItem[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export function removeItem(items: readonly InventoryItem[], id: string): InventoryItem[] {
  return items.filter((item) => item.id !== id);
}

/** Whole numbers from 0; a non-number keeps the old quantity. */
export function setQty(items: readonly InventoryItem[], id: string, qty: number): InventoryItem[] {
  return Number.isFinite(qty) ? updateItem(items, id, { qty: Math.max(0, Math.round(qty)) }) : [...items];
}

export function setCoin(currency: Currency, coin: keyof Currency, value: number): Currency {
  return Number.isFinite(value) ? { ...currency, [coin]: Math.max(0, Math.round(value)) } : currency;
}
