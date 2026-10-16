import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { cryptoRng, DiceError, roll, rollD20, type D20Mode, type D20Result, type Rng, type RollResult } from '../../dice/dice';
import { useI18n } from '../../i18n/i18n';
import { useToast } from '../components/Toast';
import { addEntry, describeD20, describeRoll, type DiceEntry } from './history';

export interface DiceApi {
  /** A d20 test with the panel's Advantage/Disadvantage setting; the result is returned (death saves use it). */
  rollD20(label: string, bonus: number): D20Result;
  /** A roll in dice notation. Damage uses the Critical setting once (double dice). Invalid notation shows a message. */
  roll(label: string, expression: string, options?: { damage?: boolean }): RollResult | undefined;
  mode: D20Mode;
  setMode(mode: D20Mode): void;
  critical: boolean;
  setCritical(on: boolean): void;
  history: DiceEntry[];
  open: boolean;
  setOpen(open: boolean): void;
}

const DiceContext = createContext<DiceApi | null>(null);

export function DiceProvider({ children, rng = cryptoRng }: { children: ReactNode; rng?: Rng }) {
  const { t } = useI18n();
  const toast = useToast();
  const [mode, setMode] = useState<D20Mode>('normal');
  const [critical, setCritical] = useState(false);
  const [history, setHistory] = useState<DiceEntry[]>([]);
  const [open, setOpen] = useState(false);
  const nextId = useRef(1);

  const push = useCallback((entry: Omit<DiceEntry, 'id'>) => {
    const id = nextId.current;
    nextId.current += 1;
    setHistory((current) => addEntry(current, { ...entry, id }));
  }, []);

  const rollD20Fn = useCallback(
    (label: string, bonus: number) => {
      const result = rollD20(bonus, mode, rng);
      push({ label, total: result.total, detail: describeD20(result, mode), natural20: result.natural20, natural1: result.natural1 });
      return result;
    },
    [mode, rng, push],
  );

  const rollFn = useCallback(
    (label: string, expression: string, options: { damage?: boolean } = {}) => {
      const crit = options.damage === true && critical;
      try {
        const result = roll(expression, { rng, critical: crit });
        push({ label: crit ? `${label} (${t('dice.critical')})` : label, total: result.total, detail: describeRoll(result) });
        if (crit) setCritical(false);
        return result;
      } catch (error) {
        if (!(error instanceof DiceError)) throw error;
        toast({ message: t('dice.invalid', { expression }), error: true });
        return undefined;
      }
    },
    [critical, rng, push, t, toast],
  );

  const value = useMemo<DiceApi>(
    () => ({ rollD20: rollD20Fn, roll: rollFn, mode, setMode, critical, setCritical, history, open, setOpen }),
    [rollD20Fn, rollFn, mode, critical, history, open],
  );
  return <DiceContext.Provider value={value}>{children}</DiceContext.Provider>;
}

export function useDice(): DiceApi {
  const dice = useContext(DiceContext);
  if (!dice) throw new Error('useDice outside DiceProvider');
  return dice;
}
