// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
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
    await user.selectOptions(screen.getByLabelText('New class'), 'srd:class:fighter');
    await user.click(screen.getByRole('button', { name: 'Add class' }));
    await user.selectOptions(screen.getByLabelText('New class'), 'srd:class:wizard');
    await user.click(screen.getByRole('button', { name: 'Add class' }));
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
    await user.selectOptions(await screen.findByLabelText('New class'), 'srd:class:cleric');
    await user.click(screen.getByRole('button', { name: 'Add class' }));
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
    await user.click(await screen.findByRole('button', { name: 'Add Fighter level' }));
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
    await user.selectOptions(await screen.findByLabelText('New class'), 'srd:class:fighter');
    await user.click(screen.getByRole('button', { name: 'Add class' }));
    await user.click(screen.getByRole('button', { name: 'Add Fighter level' }));
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

  async function addFirstLevel(user: ReturnType<typeof userEvent.setup>, classId: string) {
    await user.selectOptions(await screen.findByLabelText('New class'), classId);
    await user.click(screen.getByRole('button', { name: 'Add class' }));
  }

  it('shows the subclass picker from the first level', async () => {
    const { db } = renderApp('#/new');
    const user = userEvent.setup();
    expect(await screen.findByText('Choose a class')).toBeTruthy();
    await addFirstLevel(user, 'srd:class:fighter');
    const picker = screen.getByLabelText('Subclass') as HTMLSelectElement;
    const labels = Array.from(picker.options).map((o) => o.textContent);
    expect(labels).toContain('Champion');
    expect(labels).toContain('Battle Master (skeleton, fill in yourself)');
    expect(screen.getByText('Counts from level 3')).toBeTruthy();
    await user.selectOptions(picker, 'srd:subclass:champion');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => expect((await loadCharacters(db)).characters).toHaveLength(1));
    expect((await loadCharacters(db)).characters[0].choices.levels[0].subclassId).toBe('srd:subclass:champion');
  });

  it('offers the feat only on levels that give one', async () => {
    renderApp('#/new');
    const user = userEvent.setup();
    await addFirstLevel(user, 'srd:class:fighter');
    expect(screen.getByLabelText('Feat 1')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Add Fighter level' }));
    expect(screen.queryByLabelText('Feat 2')).toBeNull();
  });

  it('keeps a feat stored on a level that gives none', async () => {
    const db = testDb();
    const stored = kael();
    const levels = stored.choices.levels.map((l, i) => (i === 1 ? { ...l, featId: 'srd:feat:alert' } : l));
    await saveCharacter(db, { ...stored, choices: { ...stored.choices, levels } });
    renderApp('#/c/test/edit', db);
    const user = userEvent.setup();
    const feat = (await screen.findByLabelText('Feat 2')) as HTMLSelectElement;
    expect(feat.value).toBe('srd:feat:alert');
    expect(screen.getByText('This level normally gives no feat.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => expect((await loadCharacter(db, 'test'))?.updatedAt).not.toBe(stored.updatedAt));
    expect((await loadCharacter(db, 'test'))?.choices.levels[1].featId).toBe('srd:feat:alert');
  });

  it('shows Divine Order on Cleric level 1', async () => {
    renderApp('#/new');
    const user = userEvent.setup();
    await addFirstLevel(user, 'srd:class:cleric');
    const block = screen.getByRole('heading', { name: 'Cleric' }).closest('section') as HTMLElement;
    expect(within(block).getByLabelText('Protector')).toBeTruthy();
    expect(within(block).getByLabelText('Thaumaturge')).toBeTruthy();
    const origin = screen.getByRole('heading', { name: 'Species and background' }).closest('section') as HTMLElement;
    expect(within(origin).queryByLabelText('Drow')).toBeNull();
    await user.selectOptions(within(origin).getByLabelText('Species'), 'srd:species:elf');
    expect(within(origin).getByLabelText('Drow')).toBeTruthy();
    expect(within(block).queryByLabelText('Drow')).toBeNull();
  });

  it('stores a note per level', async () => {
    const { db } = renderApp('#/new');
    const user = userEvent.setup();
    await addFirstLevel(user, 'srd:class:fighter');
    await user.type(screen.getByLabelText('Notes for this level'), 'Maneuvers: Riposte');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => expect((await loadCharacters(db)).characters).toHaveLength(1));
    expect((await loadCharacters(db)).characters[0].choices.levels[0].note).toBe('Maneuvers: Riposte');
  });

  it('asks before removing a level with choices', async () => {
    renderApp('#/new');
    const user = userEvent.setup();
    await addFirstLevel(user, 'srd:class:fighter');
    await user.type(screen.getByLabelText('Notes for this level'), 'keep me');
    await user.click(screen.getByRole('button', { name: 'Remove last Fighter level' }));
    const dialog = screen.getByRole('dialog', { name: 'Remove level?' });
    expect(within(dialog).getByText('Fighter level 1 has choices or notes that will be lost.')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByLabelText('Notes for this level')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Remove last Fighter level' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(screen.queryByLabelText('Notes for this level')).toBeNull();
    expect(screen.getByText('Choose a class')).toBeTruthy();
  });

  it('removes a level without choices straight away', async () => {
    renderApp('#/new');
    const user = userEvent.setup();
    await addFirstLevel(user, 'srd:class:fighter');
    await user.click(screen.getByRole('button', { name: 'Add Fighter level' }));
    await user.click(screen.getByRole('button', { name: 'Remove last Fighter level' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByLabelText('HP 2')).toBeNull();
  });

  it('expands a feature to show its text', async () => {
    renderApp('#/new');
    const user = userEvent.setup();
    await addFirstLevel(user, 'srd:class:fighter');
    const details = screen.getByText('Second Wind').closest('details') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    await user.click(screen.getByText('Second Wind'));
    expect(details.open).toBe(true);
    expect(within(details).getByText(/limited well of physical and mental stamina/)).toBeTruthy();
  });

  it('names the subclass in the subclass slot and shows a hint for an empty skeleton', async () => {
    renderApp('#/new');
    const user = userEvent.setup();
    await addFirstLevel(user, 'srd:class:fighter');
    await user.click(screen.getByRole('button', { name: 'Add Fighter level' }));
    await user.click(screen.getByRole('button', { name: 'Add Fighter level' }));
    await user.click(screen.getByText('Fighter Subclass'));
    expect(screen.getByText('Choose your subclass above.')).toBeTruthy();
    await user.selectOptions(screen.getByLabelText('Subclass'), 'skeleton:subclass:battle-master');
    expect(screen.queryByText('Fighter Subclass')).toBeNull();
    expect(screen.getAllByText('Battle Master').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Not filled in yet').length).toBeGreaterThan(0);
  });
});
