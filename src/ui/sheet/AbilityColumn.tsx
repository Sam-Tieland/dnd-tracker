import { ABILITIES, SKILL_IDS } from '../../content/constants';
import type { DerivedSheet } from '../../rules/types';
import { useDice } from '../dice/DiceContext';
import { abilityName, formatMod, titleCase } from '../format';

/** Spec §8: the six abilities, Saving Throws and Skills. Tapping a number rolls it (spec §10). */
export function AbilityColumn({ sheet }: { sheet: DerivedSheet }) {
  const dice = useDice();
  return (
    <div className="ability-column">
      <section aria-label="Abilities" className="abilities">
        {ABILITIES.map((a) => (
          <button key={a} type="button" className="ability" onClick={() => dice.rollD20(`${abilityName(a)} check`, sheet.abilities[a].mod - sheet.d20Penalty)}>
            <span className="ability-label">{a.toUpperCase()}</span>
            <strong>{formatMod(sheet.abilities[a].mod)}</strong>
            <span className="muted">{sheet.abilities[a].score}</span>
          </button>
        ))}
      </section>
      <section>
        <h2>Saving Throws</h2>
        <ul className="check-list">
          {ABILITIES.map((a) => (
            <li key={a}>
              <button type="button" onClick={() => dice.rollD20(`${abilityName(a)} save`, sheet.saves[a].bonus)}>
                <span className={sheet.saves[a].proficient ? 'dot on' : 'dot'} aria-hidden="true" />
                <span className="check-name">{abilityName(a)}</span>
                <strong>{formatMod(sheet.saves[a].bonus)}</strong>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Skills</h2>
        <ul className="check-list">
          {SKILL_IDS.map((s) => {
            const skill = sheet.skills[s];
            return (
              <li key={s}>
                <button type="button" onClick={() => dice.rollD20(titleCase(s), skill.bonus)}>
                  <span className={skill.expertise ? 'dot on double' : skill.proficient ? 'dot on' : 'dot'} aria-hidden="true" />
                  <span className="check-name">
                    {titleCase(s)} <span className="muted">({skill.ability.toUpperCase()})</span>
                  </span>
                  <strong>{formatMod(skill.bonus)}</strong>
                </button>
              </li>
            );
          })}
        </ul>
        <p>
          Passive Perception <strong>{sheet.passivePerception}</strong>
        </p>
      </section>
    </div>
  );
}
