import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { cryptoRng, d20FromFaces, DiceError, parseRoll, roll, rollD20, rollFromTotals, type D20Mode, type D20Result, type Rng, type RollResult } from '../../dice/dice';
import { useI18n } from '../../i18n/i18n';
import { useToast } from '../components/Toast';
import { useAppData } from '../data';
import { addEntry, describeD20, describeRoll, type DiceEntry } from './history';
import { ManualRollDialog, type ManualRequest } from './ManualRollDialog';

export interface DiceApi {
  /**
   * A d20 test with the panel's Advantage/Disadvantage setting; the result is returned (death saves use it).
   * With real dice on, it waits until the player fills in their roll, and gives undefined when they cancel.
   */
  rollD20(label: string, bonus: number): Promise<D20Result | undefined>;
  /** A roll in dice notation. Damage uses the Critical setting once (double dice). Invalid notation shows a message. */
  roll(label: string, expression: string, options?: { damage?: boolean }): Promise<RollResult | undefined>;
  mode: D20Mode;
  setMode(mode: D20Mode): void;
  critical: boolean;
  setCritical(on: boolean): void;
  /** On: rolls ask what the player rolled with real dice. Remembered on this device. */
  physical: boolean;
  setPhysical(on: boolean): void;
  history: DiceEntry[];
  open: boolean;
  setOpen(open: boolean): void;
}

type Distribute<T> = T extends unknown ? Omit<T, 'id' | 'submit' | 'auto' | 'cancel'> : never;
type RequestBody = Distribute<ManualRequest>;

const DiceContext = createContext<DiceApi | null>(null);

export function DiceProvider({ children, rng = cryptoRng }: { children: ReactNode; rng?: Rng }) {
  const { t } = useI18n();
  const toast = useToast();
  const { settings, updateSettings } = useAppData();
  const physical = settings.physicalDice;
  const [mode, setMode] = useState<D20Mode>('normal');
  const [critical, setCritical] = useState(false);
  const [history, setHistory] = useState<DiceEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState<ManualRequest | null>(null);
  const requestRef = useRef<ManualRequest | null>(null);
  const nextId = useRef(1);

  const push = useCallback((entry: Omit<DiceEntry, 'id'>) => {
    const id = nextId.current;
    nextId.current += 1;
    setHistory((current) => addEntry(current, { ...entry, id }));
  }, []);

  /** Shows the dialog and waits for the player's dice (or the app's roll); a request still open is cancelled. */
  const ask = useCallback(
    <T,>(body: RequestBody, fromDice: (values: number[]) => T, fromApp: () => T) =>
      new Promise<T | undefined>((resolve) => {
        const finish = (value: T | undefined) => {
          if (requestRef.current === next) {
            requestRef.current = null;
            setRequest(null);
          }
          resolve(value);
        };
        const next = {
          ...body,
          id: nextId.current++,
          submit: (values: number[]) => finish(fromDice(values)),
          auto: () => finish(fromApp()),
          cancel: () => finish(undefined),
        } as ManualRequest;
        const previous = requestRef.current;
        requestRef.current = next;
        setRequest(next);
        previous?.cancel();
      }),
    [],
  );

  const rollD20Fn = useCallback(
    async (label: string, bonus: number) => {
      const record = (result: D20Result, manual: boolean) => {
        push({ label, total: result.total, detail: describeD20(result, mode), natural20: result.natural20, natural1: result.natural1, manual });
        return result;
      };
      if (!physical) return record(rollD20(bonus, mode, rng), false);
      return ask(
        { kind: 'd20', label, bonus, mode },
        (faces) => record(d20FromFaces(faces, bonus, mode), true),
        () => record(rollD20(bonus, mode, rng), false),
      );
    },
    [mode, rng, push, physical, ask],
  );

  const rollFn = useCallback(
    async (label: string, expression: string, options: { damage?: boolean } = {}) => {
      const crit = options.damage === true && critical;
      const shown = crit ? `${label} (${t('dice.critical')})` : label;
      const record = (result: RollResult, manual: boolean) => {
        push({ label: shown, total: result.total, detail: describeRoll(result), manual });
        if (crit) setCritical(false);
        return result;
      };
      try {
        if (!physical) return record(roll(expression, { rng, critical: crit }), false);
        parseRoll(expression);
      } catch (error) {
        if (!(error instanceof DiceError)) throw error;
        toast({ message: t('dice.invalid', { expression }), error: true });
        return undefined;
      }
      return ask(
        { kind: 'roll', label: shown, expression, critical: crit },
        (totals) => record(rollFromTotals(expression, totals, crit), true),
        () => record(roll(expression, { rng, critical: crit }), false),
      );
    },
    [critical, rng, push, t, toast, physical, ask],
  );

  const setPhysical = useCallback((on: boolean) => void updateSettings({ physicalDice: on }), [updateSettings]);

  const value = useMemo<DiceApi>(
    () => ({ rollD20: rollD20Fn, roll: rollFn, mode, setMode, critical, setCritical, physical, setPhysical, history, open, setOpen }),
    [rollD20Fn, rollFn, mode, critical, physical, setPhysical, history, open],
  );
  return (
    <DiceContext.Provider value={value}>
      {children}
      {request && <ManualRollDialog key={request.id} request={request} />}
    </DiceContext.Provider>
  );
}

export function useDice(): DiceApi {
  const dice = useContext(DiceContext);
  if (!dice) throw new Error('useDice outside DiceProvider');
  return dice;
}
