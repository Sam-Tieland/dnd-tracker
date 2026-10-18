import { useState } from 'react';
import { useI18n } from '../../i18n/i18n';
import { Section } from '../components/ErrorBoundary';
import { DicePanel } from '../dice/DicePanel';
import { useMediaQuery } from '../hooks';
import { hrefFor } from '../router';
import { AbilityColumn } from './AbilityColumn';
import { useCharacterSession } from './session';
import { SpellsTab } from './SpellsTab';
import { sheetTabs, type SheetTab } from './tabs';
import { RestBar, TopBar } from './TopBar';
import './sheet.css';

/** Phones: one column, where abilities and spells become tabs. From iPad portrait up every part has its own place. */
export const NARROW_QUERY = '(max-width: 760px)';

/**
 * The tavern sheet: parchment cards on an oak table. iPad landscape gets three columns (abilities, the character and
 * the fight, magic and dice), iPad portrait puts the character on top with two columns below, and on both everything
 * fits in one screen; long lists scroll inside their own card. On a phone the parts stack and some become tabs.
 */
export function Sheet({ id }: { id: string }) {
  const session = useCharacterSession(id);
  const { t } = useI18n();
  const narrow = useMediaQuery(NARROW_QUERY);
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
  const abilitiesTab: SheetTab = { id: 'abilities', label: t('tab.abilities'), render: (s) => <AbilityColumn character={s.character} sheet={s.sheet} /> };
  // On a wide screen the spells have their own card, so they are not a tab as well.
  const tabs = narrow ? [abilitiesTab, ...sheetTabs(t)] : sheetTabs(t).filter((x) => x.id !== 'spells');
  const current = tabs.find((x) => x.id === tab) ?? tabs.find((x) => x.id !== 'abilities') ?? tabs[0];
  return (
    <div className="sheet tavern">
      <div className="area-head">
        <Section>
          <TopBar session={session} />
        </Section>
      </div>
      {!narrow && (
        <aside className="area-abil card">
          <Section>
            <AbilityColumn character={session.character} sheet={session.sheet} />
          </Section>
        </aside>
      )}
      <main className="area-act">
        <div role="tablist" className="tabs ribbons">
          {tabs.map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={x.id === current.id} onClick={() => setTab(x.id)}>
              {x.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" className="tab-panel card">
          <Section key={current.id}>{current.render(session)}</Section>
        </div>
      </main>
      {!narrow && (
        <section className="area-spells card" aria-label={t('tab.spells')}>
          <Section>
            <SpellsTab session={session} />
          </Section>
        </section>
      )}
      <div className="area-rest">
        <Section>
          <RestBar session={session} />
        </Section>
      </div>
      <div className="area-tray">
        <DicePanel />
      </div>
    </div>
  );
}
