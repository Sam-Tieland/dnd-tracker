import type { ReactNode } from 'react';
import type { Translate } from '../../i18n/i18n';
import { ActionsTab } from './ActionsTab';
import { FeaturesTab } from './FeaturesTab';
import { InventoryTab } from './InventoryTab';
import { NotesTab } from './NotesTab';
import type { ReadySession } from './session';
import { SpellsTab } from './SpellsTab';

export interface SheetTab {
  id: string;
  label: string;
  render(session: ReadySession): ReactNode;
}

/** Spec §8: Actions, Spells, Inventory, Features, Notes. Tasks 15 and 16 add theirs in this order. */
export function sheetTabs(t: Translate): SheetTab[] {
  return [
    { id: 'actions', label: t('tab.actions'), render: (session) => <ActionsTab session={session} /> },
    { id: 'spells', label: t('tab.spells'), render: (session) => <SpellsTab session={session} /> },
    { id: 'inventory', label: t('tab.inventory'), render: (session) => <InventoryTab session={session} /> },
    { id: 'features', label: t('tab.features'), render: (session) => <FeaturesTab session={session} /> },
    { id: 'notes', label: t('tab.notes'), render: (session) => <NotesTab session={session} /> },
  ];
}
