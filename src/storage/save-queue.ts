export interface SaveQueue<T> {
  /** Schedule a save of the latest value; an earlier pending value is replaced. */
  push(value: T): void;
  /** Save the pending value now (leaving the sheet, hiding the app); also waits for a write that is already running. Always resolves. */
  flush(): Promise<void>;
}

/**
 * Bundles quick successive changes into one write (spec §12). Writes never overlap and run in the order they were
 * started, and `flush` resolves only after the write it waited for has finished. A failed write is reported and kept
 * for the next try, unless a newer value was pushed meanwhile: the newest value always wins, so an older one is never
 * written over it.
 */
export function createSaveQueue<T>(save: (value: T) => Promise<void>, onError: (error: unknown) => void, delayMs = 400): SaveQueue<T> {
  let pending: { value: T } | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  /** The last write in line; the next one starts only when it has finished. It never rejects. */
  let writes: Promise<void> = Promise.resolve();

  const report = (error: unknown) => {
    try {
      onError(error);
    } catch {
      // A reporter that throws must not stop the queue from saving.
    }
  };

  const writePending = async () => {
    if (!pending) return;
    const { value } = pending;
    pending = undefined;
    try {
      await save(value);
    } catch (error) {
      pending ??= { value };
      report(error);
    }
  };

  const flush = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    writes = writes.then(writePending);
    return writes;
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
