import { useEffect, type ReactNode } from 'react';
import { detectLanguage, I18nProvider } from '../i18n/i18n';
import type { TrackerDb } from '../storage/db';
import { Section } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { AppDataProvider, useAppData } from './data';
import { CharacterForm } from './form/CharacterForm';
import { CharacterList } from './list/CharacterList';
import { hrefFor, useRoute } from './router';
import { CreditsScreen } from './settings/CreditsScreen';
import { SettingsScreen } from './settings/SettingsScreen';
import { applyTheme } from './theme';
import './styles.css';

function ShellProviders({ children }: { children: ReactNode }) {
  const { settings } = useAppData();
  const lang = settings.language ?? detectLanguage(navigator.languages);
  useEffect(() => applyTheme(settings.theme), [settings.theme]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return (
    <I18nProvider lang={lang}>
      <ToastProvider>{children}</ToastProvider>
    </I18nProvider>
  );
}

export function Providers({ db, children }: { db: TrackerDb; children: ReactNode }) {
  return (
    <AppDataProvider db={db}>
      <ShellProviders>{children}</ShellProviders>
    </AppDataProvider>
  );
}

function Screen() {
  const route = useRoute();
  switch (route.name) {
    case 'settings':
      return <SettingsScreen />;
    case 'credits':
      return <CreditsScreen />;
    case 'new':
      return <CharacterForm />;
    case 'edit':
      return <CharacterForm id={route.id} />;
    default:
      return <CharacterList />;
  }
}

function Screens() {
  const route = useRoute();
  return (
    <Section key={hrefFor(route)}>
      <Screen />
    </Section>
  );
}

export function App({ db }: { db: TrackerDb }) {
  return (
    <Providers db={db}>
      <Screens />
    </Providers>
  );
}
