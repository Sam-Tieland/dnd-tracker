export interface DeliverEnv {
  /** Touch devices (the iPad) get the share sheet; a PC gets a download (spec §12). */
  preferShare: boolean;
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
  document: Document;
}

const browserEnv = (): DeliverEnv => ({
  preferShare: window.matchMedia('(pointer: coarse)').matches,
  canShare: navigator.canShare?.bind(navigator),
  share: navigator.share?.bind(navigator),
  document,
});

function download(name: string, file: File, env: DeliverEnv): void {
  const url = URL.createObjectURL(file);
  const link = env.document.createElement('a');
  link.href = url;
  link.download = name;
  env.document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const isAbort = (error: unknown): boolean => error instanceof DOMException && error.name === 'AbortError';

/**
 * Hands a file (JSON by default) to the player. Returns false when the share sheet was closed without sharing, or (with `onRefused`)
 * when the share sheet refused and the player was offered a retry.
 *
 * Safari refuses `share` outside a fresh tap, which an earlier await (reading the database) can use up. With `onRefused`,
 * the prepared file is kept: the callback gets a `retry` that must be called straight from a tap. It shares again with
 * no await before the call, and falls back to a download when that fails too. Without `onRefused` the error is thrown.
 */
export async function deliverFile(
  name: string,
  content: string | Uint8Array,
  env: DeliverEnv = browserEnv(),
  onRefused?: (retry: () => Promise<boolean>) => void,
  type = 'application/json',
): Promise<boolean> {
  const file = new File([content as BlobPart], name, { type });
  if (env.preferShare && env.share && env.canShare?.({ files: [file] })) {
    const share = env.share;
    try {
      await share({ files: [file], title: name });
      return true;
    } catch (error) {
      if (isAbort(error)) return false;
      if (!onRefused) throw error;
      onRefused(async () => {
        try {
          await share({ files: [file], title: name });
          return true;
        } catch (second) {
          if (isAbort(second)) return false;
          download(name, file, env);
          return true;
        }
      });
      return false;
    }
  }
  download(name, file, env);
  return true;
}
