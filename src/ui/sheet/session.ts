import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n/i18n';
import type { Character } from '../../model/character';
import { deriveSheet } from '../../rules/derive';
import type { DerivedSheet } from '../../rules/types';
import { loadCharacter, saveCharacter } from '../../storage/characters';
import { createSaveQueue, type SaveQueue } from '../../storage/save-queue';
import { useToast } from '../components/Toast';
import { useAppData } from '../data';
import { UndoStack } from './undo';

export interface ReadySession {
  status: 'ready';
  character: Character;
  sheet: DerivedSheet;
  /** Store a change. With an undo label it is a state change that shows "label · Undo" and can be undone (spec §8). */
  commit(next: Character, undoLabel?: string): void;
  /** Like commit, but built from the character as it is when this runs, e.g. from a toast tapped later. */
  apply(change: (current: Character, sheet: DerivedSheet) => Character, undoLabel?: string): void;
  undo(): void;
  canUndo: boolean;
}

type LoadState = { status: 'loading' } | { status: 'missing' } | { status: 'broken'; error: string } | { status: 'ready' };
export type SessionState = Exclude<LoadState, { status: 'ready' }> | ReadySession;

/** Undo stacks live as long as the app is open, per character, also while the player is on another screen. */
const stacks = new Map<string, UndoStack<Character['state']>>();

/** Forgets every undo stack; only the tests need this, to start each test with an empty history. */
export function resetUndoStacks(): void {
  stacks.clear();
}

/** Flushes that have started and not finished yet, so a screen that reads the character next can wait for them. */
const pendingFlushes = new Set<Promise<void>>();
const WHEN_SAVED_LIMIT_MS = 2000;

/**
 * Starts saving what is pending and remembers the flush for `whenSaved`. Callers never await it: the save queue writes
 * one at a time, and one stuck write must not stall the page that is being left.
 */
export function startFlush(queue: Pick<SaveQueue<unknown>, 'flush'>): void {
  const flush = queue.flush();
  pendingFlushes.add(flush);
  const forget = () => void pendingFlushes.delete(flush);
  void flush.then(forget, forget);
}

/**
 * Resolves when every flush that has started has finished, and at the latest after 2 seconds, so a write that never
 * finishes cannot block the next screen. Leaving the sheet saves in the background; a screen that loads the character
 * right after (the edit form) waits for this first, or it would read the character as it was before the last change.
 */
export function whenSaved(): Promise<void> {
  if (pendingFlushes.size === 0) return Promise.resolve();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, WHEN_SAVED_LIMIT_MS);
  });
  const finished = Promise.allSettled([...pendingFlushes]).then(() => undefined);
  return Promise.race([finished, limit]).finally(() => clearTimeout(timer));
}

export function useCharacterSession(id: string): SessionState {
  const { db, registry } = useAppData();
  const { t } = useI18n();
  const toast = useToast();
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [character, setCharacter] = useState<Character>();
  const [undoCount, setUndoCount] = useState(0);
  const current = useRef<Character | undefined>(undefined);
  /** Set when the sheet is left. A toast's Undo can outlive the sheet; it must not write this session's old character. */
  const disposed = useRef(false);
  useEffect(() => {
    disposed.current = false;
    return () => {
      disposed.current = true;
    };
  }, []);
  const notify = useRef({ t, toast });
  useEffect(() => {
    notify.current = { t, toast };
  });

  const queue = useMemo(
    () =>
      createSaveQueue<Character>(
        (c) => saveCharacter(db, c),
        (error) => {
          const reason = error instanceof Error ? error.message : String(error);
          notify.current.toast({ message: notify.current.t('save.failed', { reason }), error: true });
        },
      ),
    [db],
  );

  useEffect(() => {
    let alive = true;
    setLoad({ status: 'loading' });
    loadCharacter(db, id).then(
      (loaded) => {
        if (!alive) return;
        if (!loaded) {
          setLoad({ status: 'missing' });
          return;
        }
        current.current = loaded;
        setCharacter(loaded);
        setLoad({ status: 'ready' });
      },
      (error: unknown) => {
        if (alive) setLoad({ status: 'broken', error: error instanceof Error ? error.message : String(error) });
      },
    );
    return () => {
      alive = false;
    };
  }, [db, id]);

  // Review Focus 1: leaving the sheet, closing the page or hiding the app saves right away. The flush is never awaited here.
  useEffect(() => {
    const flush = () => startFlush(queue);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      flush();
    };
  }, [queue]);

  const stack = useMemo(() => {
    let found = stacks.get(id);
    if (!found) {
      found = new UndoStack<Character['state']>();
      stacks.set(id, found);
    }
    return found;
  }, [id]);
  useEffect(() => setUndoCount(stack.size), [stack]);

  const store = useCallback(
    (next: Character) => {
      if (disposed.current) return;
      const stamped = { ...next, updatedAt: new Date().toISOString() };
      current.current = stamped;
      setCharacter(stamped);
      queue.push(stamped);
    },
    [queue],
  );

  const undo = useCallback(() => {
    if (disposed.current) return;
    const entry = stack.pop();
    setUndoCount(stack.size);
    if (!entry || !current.current) return;
    store({ ...current.current, state: entry.before });
    notify.current.toast({ message: notify.current.t('undo.done', { label: entry.label }) });
  }, [stack, store]);

  const commit = useCallback(
    (next: Character, undoLabel?: string) => {
      const previous = current.current;
      store(next);
      if (undoLabel && previous) {
        stack.push({ label: undoLabel, before: previous.state });
        setUndoCount(stack.size);
        notify.current.toast({ message: undoLabel, action: { label: notify.current.t('undo.action'), run: undo } });
      }
    },
    [stack, store, undo],
  );

  const apply = useCallback(
    (change: (current: Character, sheet: DerivedSheet) => Character, undoLabel?: string) => {
      if (disposed.current || !current.current) return;
      commit(change(current.current, deriveSheet(current.current, registry)), undoLabel);
    },
    [commit, registry],
  );

  const sheet = useMemo(() => (character ? deriveSheet(character, registry) : undefined), [character, registry]);
  if (load.status !== 'ready') return load;
  if (!character || !sheet) return { status: 'loading' };
  return { status: 'ready', character, sheet, commit, apply, undo, canUndo: undoCount > 0 };
}
