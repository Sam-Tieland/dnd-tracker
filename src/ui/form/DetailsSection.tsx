import { useI18n } from '../../i18n/i18n';
import type { Character } from '../../model/character';
import type { SectionProps } from './types';

export function DetailsSection({ character, onChange }: SectionProps) {
  const { t } = useI18n();
  const set = (field: keyof Character['details']) => (value: string) => onChange({ ...character, details: { ...character.details, [field]: value } });
  return (
    <section className="card">
      <h2>{t('form.details')}</h2>
      <label className="field">
        Alignment
        <input value={character.details.alignment ?? ''} onChange={(e) => set('alignment')(e.target.value)} />
      </label>
      {(['appearance', 'personality', 'backstory'] as const).map((field) => (
        <label key={field} className="field">
          {t(`form.${field}`)}
          <textarea rows={3} value={character.details[field] ?? ''} onChange={(e) => set(field)(e.target.value)} />
        </label>
      ))}
    </section>
  );
}
