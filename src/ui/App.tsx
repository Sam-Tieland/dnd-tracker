import '@fontsource/im-fell-dw-pica/latin-400.css';
import '@fontsource/im-fell-dw-pica/latin-400-italic.css';
import '@fontsource/pirata-one/latin-400.css';
import { useEffect, type ReactNode } from 'react';
import { detectLanguage, I18nProvider } from '../i18n/i18n';
import type { TrackerDb } from '../storage/db';
import { UpdatePrompt } from './UpdatePrompt';
import { BookReader } from './books/BookReader';
import { Section } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { AppDataProvider, useAppData } from './data';
import { DiceProvider } from './dice/DiceContext';
import { CharacterForm } from './form/CharacterForm';
import { CharacterList } from './list/CharacterList';
import { hrefFor, useRoute } from './router';
import { CreditsScreen } from './settings/CreditsScreen';
import { SettingsScreen } from './settings/SettingsScreen';
import { Sheet } from './sheet/Sheet';
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
      <ToastProvider>
        <DiceProvider>{children}</DiceProvider>
      </ToastProvider>
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
    case 'sheet':
      return <Sheet id={route.id} />;
    case 'books':
      return <BookReader bookId={route.bookId} bookPage={route.bookPage} />;
    default:
      return <CharacterList />;
  }
}

function Screens() {
  const route = useRoute();
  // The reader stays open while you jump between books and pages, so pdf.js is not loaded again for every link.
  return (
    <Section key={route.name === 'books' ? '#/books' : hrefFor(route)}>
      <Screen />
    </Section>
  );
}

export function App({ db }: { db: TrackerDb }) {
  return (
    <Providers db={db}>
      <UpdatePrompt />
      <Screens />
    </Providers>
  );
}
