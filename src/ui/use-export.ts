import { useI18n } from '../i18n/i18n';
import type { Character } from '../model/character';
import { loadCharacters } from '../storage/characters';
import { buildBackup, buildCharacterExport, exportFileName, serializeExport, type ExportFile } from '../storage/export';
import { useToast } from './components/Toast';
import { useAppData } from './data';
import { deliverFile } from './deliver';

/** What an export holds, and how many stored characters had to be left out because they could not be read. */
interface Prepared {
  file: ExportFile;
  skipped: number;
}

/** Export one character or a full backup; a delivered export also resets the backup reminder (spec §12). */
export function useExport() {
  const { db, registry, userItems, updateSettings } = useAppData();
  const toast = useToast();
  const { t } = useI18n();

  /** A delivered export resets the backup reminder and says so; a partial one says what was left out. */
  const delivered = async (file: ExportFile, skipped: number) => {
    await updateSettings({ lastExportAt: file.exportedAt });
    toast(skipped > 0 ? { message: t('export.partial', { count: skipped }), error: true } : { message: t('export.done') });
  };

  const failed = (error: unknown) =>
    toast({ message: t('export.failed', { reason: error instanceof Error ? error.message : String(error) }), error: true });

  /** Everything that can fail, reading the database included, is inside the try: the error button must never fail silently. */
  const run = async (prepare: () => Promise<Prepared> | Prepared) => {
    try {
      const { file, skipped } = await prepare();
      // When the share sheet refuses (Safari, after the await above), the file stays prepared and a toast offers a fresh tap.
      const onRefused = (retry: () => Promise<boolean>) =>
        toast({
          message: t('export.shareRetry'),
          error: true,
          action: {
            label: t('export.shareAction'),
            // No await before retry(): it has to call navigator.share inside this tap.
            run: () => void retry().then((done) => (done ? delivered(file, skipped) : undefined)).catch(failed),
          },
        });
      if (await deliverFile(exportFileName(file), serializeExport(file), undefined, onRefused)) await delivered(file, skipped);
    } catch (error) {
      failed(error);
    }
  };

  return {
    exportCharacter: (character: Character) =>
      run(() => ({ file: buildCharacterExport(character, registry, userItems, new Date().toISOString()), skipped: 0 })),
    exportBackup: () =>
      run(async () => {
        const { characters, broken } = await loadCharacters(db);
        return { file: buildBackup(characters, userItems, new Date().toISOString()), skipped: broken.length };
      }),
  };
}
