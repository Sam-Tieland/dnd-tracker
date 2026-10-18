import { useState } from 'react';
import { manualTerms, parseRoll, type D20Mode } from '../../dice/dice';
import { useI18n } from '../../i18n/i18n';
import { Dialog } from '../components/Dialog';
import { formatMod } from '../format';

interface RequestBase {
  id: number;
  label: string;
  /** The faces (d20) or the totals per dice term (other rolls) the player filled in. */
  submit(values: number[]): void;
  /** Let the app roll this one after all. */
  auto(): void;
  cancel(): void;
}

export type ManualRequest =
  | (RequestBase & { kind: 'd20'; bonus: number; mode: D20Mode })
  | (RequestBase & { kind: 'roll'; expression: string; critical: boolean });

interface Field {
  name: string;
  min: number;
  max: number;
  sign: 1 | -1;
}

function fieldsFor(request: ManualRequest): { fields: Field[]; modifier: number } {
  if (request.kind === 'd20') {
    const die = { name: 'd20', min: 1, max: 20, sign: 1 as const };
    return { fields: request.mode === 'normal' ? [die] : [die, { ...die }], modifier: request.bonus };
  }
  const fields = manualTerms(request.expression, request.critical).map((term) => ({
    name: `${term.sign < 0 ? '−' : ''}${term.count}d${term.sides}`,
    min: term.count,
    max: term.count * term.sides,
    sign: term.sign,
  }));
  return { fields, modifier: parseRoll(request.expression).modifier };
}

const valid = (text: string, field: Field) => /^\d+$/.test(text.trim()) && Number(text) >= field.min && Number(text) <= field.max;

/** Real dice at the table: the player fills in what they rolled and the app adds the bonus, as with its own rolls. */
export function ManualRollDialog({ request }: { request: ManualRequest }) {
  const { t } = useI18n();
  const { fields, modifier } = fieldsFor(request);
  const [texts, setTexts] = useState(() => fields.map(() => ''));
  const ready = fields.every((field, i) => valid(texts[i], field));
  const values = texts.map(Number);
  const kept =
    request.kind === 'd20' && request.mode !== 'normal' ? (request.mode === 'advantage' ? Math.max(...values) : Math.min(...values)) : undefined;
  const total = kept !== undefined ? kept + modifier : fields.reduce((sum, field, i) => sum + field.sign * values[i], modifier);
  const what =
    request.kind === 'd20'
      ? `d20${request.mode === 'normal' ? '' : request.mode === 'advantage' ? ' Advantage' : ' Disadvantage'}${modifier === 0 ? '' : ` ${formatMod(modifier)}`}`
      : `${request.expression}${request.critical ? ` (${t('dice.critical')})` : ''}`;
  const submit = () => {
    if (ready) request.submit(values);
  };
  return (
    <Dialog
      title={request.label}
      onClose={request.cancel}
      actions={
        <>
          <button type="submit" form="manual-roll" className="primary" disabled={!ready}>
            {t('dice.manualSubmit')}
          </button>
          <button type="button" onClick={request.auto}>
            {t('dice.manualAuto')}
          </button>
        </>
      }
    >
      <p>{t(request.kind === 'd20' ? 'dice.manualHelpD20' : 'dice.manualHelpRoll', { what })}</p>
      <form
        id="manual-roll"
        className="manual-roll"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {fields.map((field, i) => {
          const text = texts[i];
          const wrong = text.trim() !== '' && !valid(text, field);
          return (
            <label key={i}>
              {fields.length > 1 && request.kind === 'd20' ? `d20 (${i + 1})` : field.name}
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                autoFocus={i === 0}
                aria-invalid={wrong}
                value={text}
                // Enter fills in from any field, also with two d20s where the form has no single field to submit from.
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    submit();
                  }
                }}
                onChange={(event) => setTexts(texts.map((old, j) => (j === i ? event.target.value : old)))}
              />
              {wrong && <span className="error">{t('dice.manualRange', { min: field.min, max: field.max })}</span>}
            </label>
          );
        })}
      </form>
      <p className="manual-total" aria-live="polite">
        {t('dice.manualTotal')}: <strong>{ready ? total : '–'}</strong>
      </p>
    </Dialog>
  );
}
