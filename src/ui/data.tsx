import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { loadBuiltinContent } from '../content/load';
import { createRegistry, type ContentRegistry } from '../content/registry';
import type { ContentItem } from '../content/schema';
import type { UserContentIssue, UserContentResult } from '../content/user';
import type { TrackerDb } from '../storage/db';
import { requestPersistence } from '../storage/persist';
import { loadSettings, saveSettings, type Settings } from '../storage/settings';
import { loadUserContent } from '../storage/user-content';

export interface AppData {
  db: TrackerDb;
  registry: ContentRegistry;
  userItems: ContentItem[];
  userContentIssues: UserContentIssue[];
  settings: Settings;
  updateSettings(patch: Partial<Settings>): Promise<void>;
}

const AppDataContext = createContext<AppData | null>(null);

/** Loads settings and own content once, builds the registry and asks for persistent storage on the first start. */
export function AppDataProvider({ db, children }: { db: TrackerDb; children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>();
  const [content, setContent] = useState<UserContentResult>();
  const [failed, setFailed] = useState(false);
  const latest = useRef<Settings>(undefined);

  useEffect(() => {
    let alive = true;
    void Promise.all([loadSettings(db), loadUserContent(db)]).then(
      ([loadedSettings, loadedContent]) => {
        if (!alive) return;
        latest.current = loadedSettings;
        setSettings(loadedSettings);
        setContent(loadedContent);
      },
      () => {
        if (alive) setFailed(true);
      },
    );
    return () => {
      alive = false;
    };
  }, [db]);

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      if (!latest.current) return;
      const next = { ...latest.current, ...patch };
      latest.current = next;
      setSettings(next);
      await saveSettings(db, next);
    },
    [db],
  );

  useEffect(() => {
    if (settings && !settings.persistRequested) {
      // A failing save only means the request is repeated on the next start.
      void requestPersistence(navigator.storage)
        .then(() => updateSettings({ persistRequested: true }))
        .catch(() => undefined);
    }
  }, [settings, updateSettings]);

  const registry = useMemo(() => createRegistry(loadBuiltinContent(), content?.items ?? []), [content]);
  const value = useMemo(
    () =>
      settings && content
        ? { db, registry, userItems: content.items, userContentIssues: content.issues, settings, updateSettings }
        : null,
    [db, registry, content, settings, updateSettings],
  );
  // This sits above the I18nProvider (the language is a setting), so the message is fixed and bilingual.
  if (failed) {
    return (
      <p className="loading" role="alert">
        Kan de opslag niet openen. · Could not open storage. Herlaad de pagina. · Reload the page.
      </p>
    );
  }
  if (!value) return <p className="loading" role="status">…</p>;
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const data = useContext(AppDataContext);
  if (!data) throw new Error('useAppData outside AppDataProvider');
  return data;
}
