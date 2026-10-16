import { useI18n } from '../i18n/i18n';
import type { Character } from '../model/character';
import { loadCharacters } from '../storage/characters';
import { buildBackup, buildCharacterExport, exportFileName, serializeExport, type ExportFile } from '../storage/export';
import { useToast } from './components/Toast';
import { useAppData } from './data';
import { deliverFile } from './deliver';

/** Export one character or a full backup; a delivered export also resets the backup reminder (spec §12). */
export function useExport() {
  const { db, registry, userItems, updateSettings } = useAppData();
  const toast = useToast();
  const { t } = useI18n();

  const finish = async (file: ExportFile) => {
    try {
      if (await deliverFile(exportFileName(file), serializeExport(file))) {
        await updateSettings({ lastExportAt: file.exportedAt });
        toast({ message: t('export.done') });
      }
    } catch (error) {
      toast({ message: t('export.failed', { reason: error instanceof Error ? error.message : String(error) }), error: true });
    }
  };

  return {
    exportCharacter: (character: Character) => finish(buildCharacterExport(character, registry, userItems, new Date().toISOString())),
    exportBackup: async () => {
      const { characters } = await loadCharacters(db);
      await finish(buildBackup(characters, userItems, new Date().toISOString()));
    },
  };
}
