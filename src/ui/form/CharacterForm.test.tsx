// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { kael } from '../../rules/testing/fixtures';
import { loadCharacter, loadCharacters, saveCharacter } from '../../storage/characters';
import { renderApp, testDb } from '../testing/render';

describe('character form', () => {
  it('creates a Fighter 1 / Wizard 1 at full hit points and opens its sheet', async () => {
    const { db } = renderApp('#/new');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Name'), 'Kael');
    await user.selectOptions(screen.getByLabelText('Class'), 'srd:class:fighter');
    await user.click(screen.getByRole('button', { name: 'Add level' }));
    await user.selectOptions(screen.getByLabelText('Class'), 'srd:class:wizard');
    await user.click(screen.getByRole('button', { name: 'Add level' }));
    expect(screen.getByText(/Multiclass prerequisite not met for Fighter/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => expect((await loadCharacters(db)).characters).toHaveLength(1));
    const [saved] = (await loadCharacters(db)).characters;
    expect(saved).toMatchObject({ name: 'Kael', state: { hpCurrent: 14 } });
    expect(saved.choices.levels.map((l) => l.classId)).toEqual(['srd:class:fighter', 'srd:class:wizard']);
    await waitFor(() => expect(window.location.hash).toBe(`#/c/${saved.id}`));
  });

  it('offers Divine Order for a Cleric and stores the choice', async () => {
    const { db } = renderApp('#/new');
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('Class'), 'srd:class:cleric');
    await user.click(screen.getByRole('button', { name: 'Add level' }));
    await user.click(screen.getByLabelText('Protector'));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () =>
      expect((await loadCharacters(db)).characters[0]?.choices.featureOptions).toEqual(['srd:feature:cleric:1:divine-order:protector']),
    );
  });

  it('edits an existing character, keeps its id and adds the hit points of a new level', async () => {
    const db = testDb();
    await saveCharacter(db, kael({ state: { hpCurrent: 30 } }));
    renderApp('#/c/test/edit', db);
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('Class'), 'srd:class:fighter');
    await user.click(screen.getByRole('button', { name: 'Add level' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => expect((await loadCharacter(db, 'test'))?.state.hpCurrent).toBe(38));
  });

  it('point buy counts the points, also while a field is cleared and typed again', async () => {
    renderApp('#/new');
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('Method'), 'pointbuy');
    expect(screen.getByText('0 of 27 points')).toBeTruthy();
    const str = screen.getByLabelText('STR');
    await user.clear(str);
    await user.type(str, '15');
    expect(screen.getByText('9 of 27 points')).toBeTruthy();
  });

  it('keeps a rolled hit point value within the hit die', async () => {
    const { db } = renderApp('#/new');
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('Class'), 'srd:class:fighter');
    await user.click(screen.getByRole('button', { name: 'Add level' }));
    await user.click(screen.getByRole('button', { name: 'Add level' }));
    await user.selectOptions(screen.getByLabelText('HP 2'), 'rolled');
    const rolled = screen.getByLabelText('Rolled HP');
    await user.clear(rolled);
    await user.type(rolled, '300');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => expect((await loadCharacters(db)).characters).toHaveLength(1));
    const [saved] = (await loadCharacters(db)).characters;
    expect(saved.choices.levels[1].hp).toBe(10);
  });

  it('saves the languages as typed, also when the field is never left', async () => {
    const { db } = renderApp('#/new');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Languages (comma-separated)'), 'Common, Dwarvish');
    // fireEvent does not move focus, so no blur happens before the save, like a tap on a phone
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => expect((await loadCharacters(db)).characters).toHaveLength(1));
    const [saved] = (await loadCharacters(db)).characters;
    expect(saved.choices.languages).toEqual(['Common', 'Dwarvish']);
  });

  it('keeps the comma visible while typing a list and saves the tools without it', async () => {
    const { db } = renderApp('#/new');
    const user = userEvent.setup();
    const tools = (await screen.findByLabelText('Tools (comma-separated)')) as HTMLInputElement;
    await user.type(tools, 'Dice set, ');
    expect(tools.value).toBe('Dice set, ');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => expect((await loadCharacters(db)).characters).toHaveLength(1));
    const [saved] = (await loadCharacters(db)).characters;
    expect(saved.choices.toolProficiencies).toEqual(['Dice set']);
  });
});
