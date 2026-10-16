// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { kael } from '../../rules/testing/fixtures';
import { loadCharacter, saveCharacter } from '../../storage/characters';
import { renderApp, testDb } from '../testing/render';

async function openKael(patch: Parameters<typeof kael>[0] = {}) {
  const db = testDb();
  await saveCharacter(db, kael({ ...patch, state: { hpCurrent: 40 } }));
  renderApp('#/c/test', db);
  await screen.findByTestId('hp');
  return { db, user: userEvent.setup() };
}

describe('actions tab', () => {
  it('rolls attacks and counts down resources and spell slots', async () => {
    const { db, user } = await openKael({ choices: { spells: [{ classId: 'srd:class:wizard', spellId: 'srd:spell:fire-bolt', prepared: true }] } });
    await user.click(screen.getByRole('button', { name: 'Longsword: attack +6' }));
    expect(screen.getAllByText('Longsword: attack').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Fire Bolt: damage 2d10' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Use Second Wind' }));
    expect(screen.getByText('Second Wind 1/2')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Level 1 slot 1' }));
    expect(screen.getByRole('button', { name: 'Level 1 slot 1' }).getAttribute('aria-pressed')).toBe('true');
    await waitFor(async () =>
      expect((await loadCharacter(db, 'test'))?.state).toMatchObject({ resourcesUsed: { 'second-wind': 1 }, slotsUsed: { '1': 1 } }),
    );
  });
});

describe('spells tab', () => {
  it('shows the caster stats and adds and prepares a class spell', async () => {
    const { db, user } = await openKael();
    await user.click(screen.getByRole('tab', { name: 'Spells' }));
    expect(screen.getByText('Intelligence · Spell Attack +5 · Spell Save DC 13')).toBeTruthy();
    await user.selectOptions(screen.getByLabelText('Add a Wizard spell'), 'srd:spell:magic-missile');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('Magic Missile')).toBeTruthy();
    await user.click(screen.getByLabelText('Magic Missile prepared'));
    await waitFor(async () =>
      expect((await loadCharacter(db, 'test'))?.choices.spells).toEqual([{ classId: 'srd:class:wizard', spellId: 'srd:spell:magic-missile', prepared: false }]),
    );
  });

  it('adds a Magic Initiate cantrip with the ability chosen for the feat', async () => {
    const { db, user } = await openKael();
    await user.click(screen.getByRole('tab', { name: 'Spells' }));
    await user.selectOptions(screen.getByLabelText('Spell list'), 'srd:class:cleric');
    await user.selectOptions(screen.getByLabelText('Spellcasting ability'), 'wis');
    await user.selectOptions(screen.getByLabelText('Spell'), 'srd:spell:sacred-flame');
    await user.click(screen.getByRole('button', { name: 'Add spell from a feat' }));
    await waitFor(async () =>
      expect((await loadCharacter(db, 'test'))?.choices.spells).toEqual([
        { classId: 'srd:class:cleric', spellId: 'srd:spell:sacred-flame', prepared: true, ability: 'wis' },
      ]),
    );
  });
});
