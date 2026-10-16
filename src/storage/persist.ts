/** Asks the browser to keep this site's storage (spec §12). No support or a refusal is not an error. */
export async function requestPersistence(storage: { persist?: () => Promise<boolean> } | undefined): Promise<boolean> {
  try {
    return (await storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
