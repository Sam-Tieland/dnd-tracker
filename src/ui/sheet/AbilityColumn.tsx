import { ABILITIES, SKILL_IDS } from '../../content/constants';
import type { DerivedSheet } from '../../rules/types';
import { useDice } from '../dice/DiceContext';
import { abilityName, formatMod, titleCase } from '../format';

/**
 * Spec §8: the six abilities as on the 2024 sheet, each block holding its own Saving Throw and Skills, so everything
 * that rolls on Wisdom is in one place. Tapping a number rolls it (spec §10).
 */
export function AbilityColumn({ sheet }: { sheet: DerivedSheet }) {
  const dice = useDice();
  return (
    <div className="ability-column">
      <div className="ability-blocks">
        {ABILITIES.map((a) => {
          const name = abilityName(a);
          const save = sheet.saves[a];
          const skills = SKILL_IDS.filter((s) => sheet.skills[s].ability === a);
          return (
            <section key={a} className="ability-block" aria-label={name}>
              <button type="button" className="ability" onClick={() => dice.rollD20(`${name} check`, sheet.abilities[a].mod - sheet.d20Penalty)}>
                <span className="ability-label">{name}</span>
                <strong>{formatMod(sheet.abilities[a].mod)}</strong>
                <span className="ability-score">{sheet.abilities[a].score}</span>
              </button>
              <ul className="check-list">
                <li className="save-row">
                  <button type="button" aria-label={`${name} saving throw ${formatMod(save.bonus)}`} onClick={() => dice.rollD20(`${name} save`, save.bonus)}>
                    <span className={save.proficient ? 'dot on' : 'dot'} aria-hidden="true" />
                    <span className="check-name">Saving Throw</span>
                    <strong>{formatMod(save.bonus)}</strong>
                  </button>
                </li>
                {skills.map((s) => {
                  const skill = sheet.skills[s];
                  return (
                    <li key={s}>
                      <button type="button" onClick={() => dice.rollD20(titleCase(s), skill.bonus)}>
                        <span className={skill.expertise ? 'dot on double' : skill.proficient ? 'dot on' : 'dot'} aria-hidden="true" />
                        <span className="check-name">{titleCase(s)}</span>
                        <strong>{formatMod(skill.bonus)}</strong>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
      <p className="passive">
        Passive Perception <strong>{sheet.passivePerception}</strong>
      </p>
    </div>
  );
}
