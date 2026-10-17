import { useRef, useState } from 'react';
import { useI18n } from '../i18n/i18n';
import { ImportError, parseExportFile } from '../storage/export';
import { planImport, type ImportPlan } from '../storage/import';
import { useToast } from './components/Toast';
import { useAppData } from './data';
import { ImportDialog } from './settings/ImportDialog';

/** Import button with its file chooser and overview dialog (spec §12); used on the list and in Settings. */
export function ImportButton({ onImported }: { onImported?: () => void }) {
  const { db, reloadContent } = useAppData();
  const { t } = useI18n();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState<ImportPlan>();

  const fail = (error: unknown) => {
    const reason = error instanceof Error ? error.message : String(error);
    toast({ message: error instanceof ImportError ? t(`import.error.${error.code}` as const, { reason }) : t('import.failed', { reason }), error: true });
  };

  const choose = async (file: File | undefined) => {
    // Emptied after every choice, so the same file can be chosen again.
    if (input.current) input.current.value = '';
    if (!file) return;
    try {
      setPlan(await planImport(db, parseExportFile(await file.text())));
    } catch (error) {
      fail(error);
    }
  };

  return (
    <>
      <button type="button" onClick={() => input.current?.click()}>
        {t('import.button')}
      </button>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        data-testid="import-input"
        hidden
        onChange={(e) => void choose(e.target.files?.[0])}
      />
      {plan && (
        <ImportDialog
          plan={plan}
          onClose={() => setPlan(undefined)}
          onDone={(result) => {
            // The data is written; if reading it back fails, it shows after a reload.
            void reloadContent()
              .catch(() => undefined)
              .then(() => {
                setPlan(undefined);
                toast({ message: t('import.done', { ...result }) });
                onImported?.();
              });
          }}
          onError={(error) => {
            setPlan(undefined);
            fail(error);
          }}
        />
      )}
    </>
  );
}
