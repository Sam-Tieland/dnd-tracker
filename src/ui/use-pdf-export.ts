import { useI18n } from '../i18n/i18n';
import type { Character } from '../model/character';
import { exportFileName, buildCharacterExport } from '../storage/export';
import { loadSheetTemplate } from '../storage/sheet-template';
import { useToast } from './components/Toast';
import { useAppData } from './data';
import { fillSheet, TemplateError } from './pdf/fill-sheet';
import { sheetValues } from './pdf/sheet-values';
import { useDeliver } from './use-deliver';

/** Fills the player's own character sheet with a character and hands over the PDF. A PDF is no backup: the reminder stays. */
export function usePdfExport() {
  const { db, registry } = useAppData();
  const toast = useToast();
  const { t } = useI18n();
  const deliver = useDeliver();

  const failed = (error: unknown) => {
    const reason = error instanceof TemplateError ? t(`pdf.error.${error.code}` as const) : error instanceof Error ? error.message : String(error);
    toast({ message: t('pdf.failed', { reason }), error: true });
  };
  const done = () => toast({ message: t('pdf.done') });

  return {
    exportPdf: async (character: Character): Promise<void> => {
      try {
        const template = await loadSheetTemplate(db);
        if (!template) {
          toast({ message: t('pdf.noTemplate') });
          return;
        }
        const bytes = await fillSheet(template.bytes, sheetValues(character, registry));
        const name = exportFileName(buildCharacterExport(character, registry, [], new Date().toISOString())).replace(/\.json$/, '.pdf');
        if (await deliver(name, bytes, 'application/pdf', done, failed)) done();
      } catch (error) {
        failed(error);
      }
    },
  };
}
