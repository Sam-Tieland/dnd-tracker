import { useState } from 'react';
import { useI18n } from '../../i18n/i18n';
import { Section } from '../components/ErrorBoundary';
import { DicePanel } from '../dice/DicePanel';
import { useMediaQuery } from '../hooks';
import { hrefFor } from '../router';
import { AbilityColumn } from './AbilityColumn';
import { useCharacterSession } from './session';
import { sheetTabs, type SheetTab } from './tabs';
import { TopBar } from './TopBar';
import './sheet.css';

/**
 * Spec §8, the hybrid sheet: a fixed bar on top, abilities on the left, tabs on the right. On iPad portrait and other
 * narrow screens the left column becomes a tab; the first other tab stays the default.
 */
export function Sheet({ id }: { id: string }) {
  const session = useCharacterSession(id);
  const { t } = useI18n();
  const narrow = useMediaQuery('(max-width: 900px)');
  const [tab, setTab] = useState<string>();
  if (session.status === 'loading') return null;
  if (session.status !== 'ready') {
    return (
      <main className="screen">
        <p role="alert">{session.status === 'missing' ? t('sheet.missing') : t('sheet.broken', { error: session.error })}</p>
        <a className="button" href={hrefFor({ name: 'list' })}>
          {t('nav.back')}
        </a>
      </main>
    );
  }
  const abilitiesTab: SheetTab = { id: 'abilities', label: t('tab.abilities'), render: (s) => <AbilityColumn sheet={s.sheet} /> };
  const tabs = narrow ? [abilitiesTab, ...sheetTabs(t)] : sheetTabs(t);
  const current = tabs.find((x) => x.id === tab) ?? tabs.find((x) => x.id !== 'abilities') ?? tabs[0];
  return (
    <div className="sheet">
      <Section>
        <TopBar session={session} />
      </Section>
      <div className="sheet-body">
        {!narrow && (
          <aside className="sheet-left">
            <Section>
              <AbilityColumn sheet={session.sheet} />
            </Section>
          </aside>
        )}
        <main className="sheet-main">
          <div role="tablist" className="tabs">
            {tabs.map((x) => (
              <button key={x.id} type="button" role="tab" aria-selected={x.id === current.id} onClick={() => setTab(x.id)}>
                {x.label}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="tab-panel">
            <Section key={current.id}>{current.render(session)}</Section>
          </div>
        </main>
      </div>
      <DicePanel />
    </div>
  );
}
