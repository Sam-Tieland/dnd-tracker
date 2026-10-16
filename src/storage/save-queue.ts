export interface SaveQueue<T> {
  /** Schedule a save of the latest value; an earlier pending value is replaced. */
  push(value: T): void;
  /** Save the pending value now (leaving the sheet, hiding the app). */
  flush(): Promise<void>;
}

/** Bundles quick successive changes into one write (spec §12). A failed write is reported and kept for the next try. */
export function createSaveQueue<T>(save: (value: T) => Promise<void>, onError: (error: unknown) => void, delayMs = 400): SaveQueue<T> {
  let pending: { value: T } | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = async () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    if (!pending) return;
    const { value } = pending;
    pending = undefined;
    try {
      await save(value);
    } catch (error) {
      pending ??= { value };
      onError(error);
    }
  };

  return {
    push(value) {
      pending = { value };
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => void flush(), delayMs);
    },
    flush,
  };
}
