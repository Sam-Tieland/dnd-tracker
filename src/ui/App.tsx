import { useEffect, type ReactNode } from 'react';
import { detectLanguage, I18nProvider, useI18n } from '../i18n/i18n';
import type { TrackerDb } from '../storage/db';
import { Section } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { AppDataProvider, useAppData } from './data';
import { hrefFor, useRoute } from './router';
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

function Screens() {
  const route = useRoute();
  const { t } = useI18n();
  return (
    <Section key={hrefFor(route)}>
      <main className="screen">
        <h1>{t('app.title')}</h1>
      </main>
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
