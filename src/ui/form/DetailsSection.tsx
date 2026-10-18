import { useRef } from 'react';
import { useI18n } from '../../i18n/i18n';
import type { Character } from '../../model/character';
import { useToast } from '../components/Toast';
import { pictureToDataUrl } from './picture';
import type { SectionProps } from './types';

type Details = Character['details'];
type TextDetail = Exclude<keyof Details, PictureDetail>;
type PictureDetail = 'portrait' | 'factionSymbol';
type LongDetail = 'appearance' | 'personality' | 'ideals' | 'bonds' | 'flaws' | 'backstory' | 'allies' | 'treasure';

/** Everything the official character sheet asks for that the rules do not work out, grouped as on the sheet. */
export function DetailsSection({ character, onChange }: SectionProps) {
  const { t } = useI18n();
  const setDetails = (details: Details) => onChange({ ...character, details });
  const update = (patch: Partial<Details>) => setDetails({ ...character.details, ...patch });
  const line = (field: TextDetail, label: string) => (
    <label key={field} className="field">
      {label}
      <input value={character.details[field] ?? ''} onChange={(e) => update({ [field]: e.target.value })} />
    </label>
  );
  const text = (field: LongDetail, rows = 3) => (
    <label key={field} className="field">
      {t(`form.${field}`)}
      <textarea rows={rows} value={character.details[field] ?? ''} onChange={(e) => update({ [field]: e.target.value })} />
    </label>
  );
  const picture = (field: PictureDetail) => (
    <PictureField
      field={field}
      value={character.details[field]}
      onPick={(url) => update({ [field]: url })}
      onRemove={() => {
        const { [field]: _removed, ...rest } = character.details;
        setDetails(rest);
      }}
    />
  );
  return (
    <section className="card">
      <h2>{t('form.details')}</h2>
      <div className="details-grid">
        {line('playerName', t('form.playerName'))}
        {line('xp', t('form.xp'))}
        {line('alignment', 'Alignment')}
      </div>

      <h3 className="details-heading">{t('form.looks')}</h3>
      <div className="details-grid">{(['age', 'height', 'weight', 'eyes', 'skin', 'hair'] as const).map((field) => line(field, t(`form.${field}`)))}</div>
      {text('appearance')}
      {picture('portrait')}

      <h3 className="details-heading">{t('form.character')}</h3>
      {text('personality')}
      {text('ideals', 2)}
      {text('bonds', 2)}
      {text('flaws', 2)}

      <h3 className="details-heading">{t('form.story')}</h3>
      {text('backstory', 5)}
      {text('allies')}
      {line('factionName', t('form.factionName'))}
      {picture('factionSymbol')}
      {text('treasure')}
    </section>
  );
}

function PictureField({ field, value, onPick, onRemove }: { field: PictureDetail; value?: string; onPick: (url: string) => void; onRemove: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const label = t(`form.${field}`);

  const choose = async (file: File | undefined) => {
    // Emptied after every choice, so the same file can be chosen again.
    if (input.current) input.current.value = '';
    if (!file) return;
    try {
      onPick(await pictureToDataUrl(file));
    } catch {
      toast({ message: t('form.pictureFailed'), error: true });
    }
  };

  return (
    <div className="field picture-field">
      <span>{label}</span>
      {value && <img className="picture-preview" src={value} alt={label} />}
      <div className="row">
        <button type="button" onClick={() => input.current?.click()}>
          {value ? t('form.pictureChange') : t('form.pictureChoose')}
        </button>
        {value && (
          <button type="button" onClick={onRemove}>
            {t('form.pictureRemove')}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" data-testid={`${field}-input`} hidden onChange={(e) => void choose(e.target.files?.[0])} />
    </div>
  );
}
