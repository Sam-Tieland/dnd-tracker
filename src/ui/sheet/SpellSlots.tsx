import { useI18n } from '../../i18n/i18n';
import { setPactSlotsUsed, setSlotsUsed } from '../../rules/actions';
import type { ReadySession } from './session';

/**
 * Spec §8: spell slots and Pact Magic as coins; a spent slot is an empty ring. Slots are spent from the right, so the
 * coins still in hand stay on the left. Slot 1 is the rightmost coin; tapping a coin spends or regains up to it.
 */
export function SpellSlots({ session }: { session: ReadySession }) {
  const { character, sheet, commit } = session;
  const { t } = useI18n();
  const { slots, pact } = sheet.spellcasting;
  if (slots.length === 0 && !pact) return null;
  const boxes = (level: number, max: number, used: number, set: (used: number) => void) =>
    Array.from({ length: max }, (_, i) => i)
      .reverse()
      .map((i) => (
        <button
          key={i}
          type="button"
          className={i < used ? 'slot used' : 'slot'}
          aria-pressed={i < used}
          aria-label={t('slots.slot', { level, n: i + 1 })}
          onClick={() => set(i < used ? i : i + 1)}
        />
      ));
  return (
    <section>
      <h2>Spell Slots</h2>
      {slots.map((s) => (
        <div key={s.level} className="row slot-row">
          <span>Level {s.level}</span>
          {boxes(s.level, s.max, s.used, (used) => commit(setSlotsUsed(character, s.level, used, sheet), t('undo.slots', { level: s.level, left: s.max - used, max: s.max })))}
        </div>
      ))}
      {pact && (
        <div className="row slot-row">
          <span>Pact Magic (Level {pact.slotLevel})</span>
          {boxes(pact.slotLevel, pact.slots, pact.used, (used) => commit(setPactSlotsUsed(character, used, sheet), `Pact Magic: ${pact.slots - used}/${pact.slots}`))}
        </div>
      )}
    </section>
  );
}
