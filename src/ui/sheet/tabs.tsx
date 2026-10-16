import type { ReactNode } from 'react';
import type { Translate } from '../../i18n/i18n';
import { NotesTab } from './NotesTab';
import type { ReadySession } from './session';

export interface SheetTab {
  id: string;
  label: string;
  render(session: ReadySession): ReactNode;
}

/** Spec §8: Actions, Spells, Inventory, Features, Notes. Tasks 15 and 16 add theirs in this order. */
export function sheetTabs(t: Translate): SheetTab[] {
  return [{ id: 'notes', label: t('tab.notes'), render: (session) => <NotesTab session={session} /> }];
}
