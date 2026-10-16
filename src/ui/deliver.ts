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

/** Hands a JSON file to the player. Returns false when the share sheet was closed without sharing. */
export async function deliverFile(name: string, text: string, env: DeliverEnv = browserEnv()): Promise<boolean> {
  const file = new File([text], name, { type: 'application/json' });
  if (env.preferShare && env.share && env.canShare?.({ files: [file] })) {
    try {
      await env.share({ files: [file], title: name });
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false;
      throw error;
    }
  }
  const url = URL.createObjectURL(file);
  const link = env.document.createElement('a');
  link.href = url;
  link.download = name;
  env.document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
