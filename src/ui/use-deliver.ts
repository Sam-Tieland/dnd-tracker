import { useI18n } from '../i18n/i18n';
import { useToast } from './components/Toast';
import { deliverFile } from './deliver';

/**
 * Delivers a file; when the share sheet refuses (Safari, after an await), a toast offers a fresh tap that shares again.
 * `onDelivered` runs after a delivery (the first one or the retry), `onFailed` when the retry throws.
 * Resolves true when the file was delivered straight away.
 */
export function useDeliver() {
  const toast = useToast();
  const { t } = useI18n();
  return async (
    name: string,
    content: string | Uint8Array,
    type: string,
    onDelivered: () => unknown,
    onFailed: (error: unknown) => void,
    retryMessage: 'export.shareRetry' | 'pdf.shareRetry' = 'export.shareRetry',
  ): Promise<boolean> => {
    const onRefused = (retry: () => Promise<boolean>) =>
      toast({
        message: t(retryMessage),
        error: true,
        action: {
          label: t('export.shareAction'),
          // No await before retry(): it has to call navigator.share inside this tap.
          run: () => void retry().then((done) => (done ? onDelivered() : undefined)).catch(onFailed),
        },
      });
    return deliverFile(name, content, undefined, onRefused, type);
  };
}
