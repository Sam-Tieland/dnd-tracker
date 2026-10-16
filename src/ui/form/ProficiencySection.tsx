import { SKILL_IDS } from '../../content/constants';
import { useI18n } from '../../i18n/i18n';
import { useAppData } from '../data';
import { titleCase } from '../format';
import { setExpertise, setSkill } from './form-logic';
import { ListInput } from './ListInput';
import type { SectionProps } from './types';

/** Skills the background gives are fixed; class skills, expertise, languages and tools are chosen here. */
export function ProficiencySection({ character, onChange }: SectionProps) {
  const { registry } = useAppData();
  const { t } = useI18n();
  const { backgroundId, skillProficiencies, expertise, languages, toolProficiencies } = character.choices;
  const fromBackground = new Set(backgroundId ? (registry.getOf('background', backgroundId)?.skillProficiencies ?? []) : []);
  const setLanguages = (next: string[]) => onChange({ ...character, choices: { ...character.choices, languages: next } });
  const setTools = (next: string[]) => onChange({ ...character, choices: { ...character.choices, toolProficiencies: next } });
  return (
    <section className="card">
      <h2>Proficiencies</h2>
      <table className="skill-table">
        <thead>
          <tr>
            <th>Skill</th>
            <th>Proficient</th>
            <th>Expertise</th>
          </tr>
        </thead>
        <tbody>
          {SKILL_IDS.map((skill) => {
            const name = titleCase(skill);
            const proficient = fromBackground.has(skill) || skillProficiencies.includes(skill);
            return (
              <tr key={skill}>
                <td>{name}</td>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`${name} Proficient`}
                    checked={proficient}
                    disabled={fromBackground.has(skill)}
                    onChange={(e) => onChange(setSkill(character, skill, e.target.checked))}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`${name} Expertise`}
                    checked={expertise.includes(skill)}
                    disabled={!proficient}
                    onChange={(e) => onChange(setExpertise(character, skill, e.target.checked))}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <label className="field">
        {t('form.languages')}
        <ListInput value={languages} onCommit={setLanguages} />
      </label>
      <label className="field">
        {t('form.tools')}
        <ListInput value={toolProficiencies} onCommit={setTools} />
      </label>
    </section>
  );
}
