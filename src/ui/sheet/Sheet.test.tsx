// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Character } from '../../model/character';
import { kael } from '../../rules/testing/fixtures';
import { loadCharacter, saveCharacter } from '../../storage/characters';
import { renderApp, setMatchMedia, testDb } from '../testing/render';
import { resetUndoStacks, whenSaved } from './session';

async function openKael(state: Partial<Character['state']> = { hpCurrent: 40 }) {
  const db = testDb();
  await saveCharacter(db, kael({ state }));
  const view = renderApp('#/c/test', db);
  await screen.findByTestId('hp');
  return { ...view, user: userEvent.setup() };
}

async function damage(user: ReturnType<typeof userEvent.setup>, amount: string) {
  await user.type(screen.getByLabelText('Amount'), amount);
  await user.click(screen.getByRole('button', { name: /Damage/ }));
}

afterEach(() => {
  vi.restoreAllMocks();
  // The page-hidden test overrides the visibility state; leave it the way jsdom has it for the tests that follow.
  Reflect.deleteProperty(document, 'visibilityState');
  // Every test uses the character id "test"; undo history must not carry over from one test to the next.
  resetUndoStacks();
});

const topBar = () => within(screen.getByRole('banner'));

describe('sheet', () => {
  it('shows the fixed bar and the left column', async () => {
    await openKael();
    expect(screen.getByTestId('hp').textContent).toBe('40/40');
    expect(screen.getByTestId('ac').textContent).toBe('19');
    expect(screen.getByText('Fighter 3 (Champion) / Wizard 2 · Level 5')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Initiative \+1/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Athletics/ })).toBeTruthy();
  });

  it('takes damage, offers to undo it, and saves both', async () => {
    const { db, user } = await openKael();
    await damage(user, '7');
    expect(screen.getByTestId('hp').textContent).toBe('33/40');
    expect(screen.getByText('HP −7')).toBeTruthy();
    await waitFor(async () => expect((await loadCharacter(db, 'test'))?.state.hpCurrent).toBe(33));
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByTestId('hp').textContent).toBe('40/40');
    await waitFor(async () => expect((await loadCharacter(db, 'test'))?.state.hpCurrent).toBe(40));
  });

  it('undoes older changes one by one from the top bar', async () => {
    const { user } = await openKael();
    await damage(user, '5');
    await damage(user, '3');
    expect(screen.getByTestId('hp').textContent).toBe('32/40');
    await user.click(screen.getByRole('button', { name: 'Undo last change' }));
    await user.click(screen.getByRole('button', { name: 'Undo last change' }));
    expect(screen.getByTestId('hp').textContent).toBe('40/40');
    expect(screen.getByRole('button', { name: 'Undo last change' }).hasAttribute('disabled')).toBe(true);
  });

  it('an empty, zero or negative amount cannot be applied', async () => {
    const { user } = await openKael();
    const button = screen.getByRole('button', { name: /Damage/ });
    expect(button.hasAttribute('disabled')).toBe(true);
    await user.type(screen.getByLabelText('Amount'), '-3');
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('at 0 hit points: death saves, a critical hit counts twice, and no rest', async () => {
    const { user } = await openKael({ hpCurrent: 0 });
    expect(screen.getByRole('group', { name: 'Death Saving Throws' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Short Rest' }).hasAttribute('disabled')).toBe(true);
    await user.click(screen.getByLabelText('Critical hit'));
    await damage(user, '2');
    expect(screen.getByText('Failures ●●○')).toBeTruthy();
  });

  it('saves a change straight away when the sheet is left', async () => {
    const { db, user, unmount } = await openKael();
    await damage(user, '4');
    unmount();
    // The save queue waits 400 ms; leaving the sheet must not wait for that, so look before it could have fired.
    await waitFor(async () => expect((await loadCharacter(db, 'test'))?.state.hpCurrent).toBe(36), { timeout: 300, interval: 10 });
  });

  it('keeps a change that is made right before tapping Edit, also when the form saves', async () => {
    const { db, user } = await openKael();
    await damage(user, '7');
    // No waiting: the 400 ms save has not fired yet when the form opens and reads the character.
    await user.click(screen.getByRole('link', { name: 'Edit' }));
    const name = await screen.findByLabelText('Name');
    await user.clear(name);
    await user.type(name, 'Kael the Bold');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(window.location.hash).toBe('#/c/test'));
    await waitFor(async () => expect(await loadCharacter(db, 'test')).toMatchObject({ name: 'Kael the Bold', state: { hpCurrent: 33 } }));
  });

  /** A slow IndexedDB write makes it visible whether a flush was registered for whenSaved or fired as a bare flush. */
  function slowPuts(db: ReturnType<typeof testDb>) {
    const put = db.characters.put.bind(db.characters) as (...args: unknown[]) => Promise<unknown>;
    vi.spyOn(db.characters, 'put').mockImplementation(((...args: unknown[]) =>
      new Promise((resolve) => setTimeout(resolve, 30)).then(() => put(...args))) as typeof db.characters.put);
  }

  it('Damage → immediate Edit → Save keeps the HP, also when the write takes a while', async () => {
    const { db, user } = await openKael();
    slowPuts(db);
    await damage(user, '7');
    await user.click(screen.getByRole('link', { name: 'Edit' }));
    const name = await screen.findByLabelText('Name');
    await user.clear(name);
    await user.type(name, 'Kael the Bold');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(window.location.hash).toBe('#/c/test'));
    await waitFor(async () => expect(await loadCharacter(db, 'test')).toMatchObject({ name: 'Kael the Bold', state: { hpCurrent: 33 } }));
  });

  it('a flush on pagehide is registered for whenSaved, so a screen that reads next waits for the write', async () => {
    const { db, user } = await openKael();
    slowPuts(db);
    await damage(user, '4');
    window.dispatchEvent(new Event('pagehide'));
    await whenSaved();
    expect((await loadCharacter(db, 'test'))?.state.hpCurrent).toBe(36);
  });

  it('a flush on hiding the app is registered for whenSaved too', async () => {
    const { db, user } = await openKael();
    slowPuts(db);
    await damage(user, '4');
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    await whenSaved();
    expect((await loadCharacter(db, 'test'))?.state.hpCurrent).toBe(36);
  });

  it('saves a change straight away when the page is hidden or closed', async () => {
    const { db, user } = await openKael();
    await damage(user, '4');
    // The save queue waits 400 ms; a flush on pagehide or on hiding the app must not wait for that.
    window.dispatchEvent(new Event('pagehide'));
    await waitFor(async () => expect((await loadCharacter(db, 'test'))?.state.hpCurrent).toBe(36), { timeout: 300, interval: 10 });
    await damage(user, '2');
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    await waitFor(async () => expect((await loadCharacter(db, 'test'))?.state.hpCurrent).toBe(34), { timeout: 300, interval: 10 });
  });

  it('on a narrow screen the left column becomes a tab', async () => {
    setMatchMedia((query) => query === '(max-width: 900px)');
    const { user } = await openKael();
    expect(screen.queryByRole('button', { name: /Athletics/ })).toBeNull();
    await user.click(screen.getByRole('tab', { name: 'Abilities' }));
    expect(screen.getByRole('button', { name: /Athletics/ })).toBeTruthy();
  });

  it('a Short Rest spends the chosen hit dice and heals die + CON', async () => {
    const { user } = await openKael({ hpCurrent: 20 });
    await user.click(screen.getByRole('button', { name: 'Short Rest' }));
    await user.click(screen.getByRole('button', { name: 'One more d10' }));
    await user.click(screen.getByRole('button', { name: 'Roll and rest' }));
    const hp = Number(screen.getByTestId('hp').textContent!.split('/')[0]);
    expect(hp).toBeGreaterThanOrEqual(23);
    expect(hp).toBeLessThanOrEqual(32);
  });

  it('keeps notes', async () => {
    const { db, user } = await openKael();
    await user.click(screen.getByRole('tab', { name: 'Notes' }));
    await user.click(screen.getByRole('button', { name: 'New note' }));
    await user.type(screen.getByLabelText('Title'), 'Session 1');
    await waitFor(async () => expect((await loadCharacter(db, 'test'))?.notes.map((n) => n.title)).toEqual(['Session 1']));
  });

  describe('a forgotten dice setting (Ruling 15)', () => {
    it('shows an Advantage chip in the top bar that clears the mode', async () => {
      const { user } = await openKael();
      expect(topBar().queryByRole('button', { name: 'Advantage' })).toBeNull();
      await user.click(screen.getByRole('button', { name: 'Open dice' }));
      await user.click(screen.getByRole('button', { name: 'Advantage' }));
      const chip = topBar().getByRole('button', { name: 'Advantage' });
      await user.click(chip);
      expect(topBar().queryByRole('button', { name: 'Advantage' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Normal' }).getAttribute('aria-pressed')).toBe('true');
    });

    it('shows a Disadvantage chip and a Critical chip that clear themselves when tapped', async () => {
      const { user } = await openKael();
      await user.click(screen.getByRole('button', { name: 'Open dice' }));
      await user.click(screen.getByRole('button', { name: 'Disadvantage' }));
      await user.click(screen.getByRole('button', { name: 'Critical' }));
      await user.click(topBar().getByRole('button', { name: 'Disadvantage' }));
      expect(topBar().queryByRole('button', { name: 'Disadvantage' })).toBeNull();
      expect(topBar().getByRole('button', { name: 'Critical' })).toBeTruthy();
      await user.click(topBar().getByRole('button', { name: 'Critical' }));
      expect(topBar().queryByRole('button', { name: 'Critical' })).toBeNull();
    });
  });

  describe('a dead character (Ruling 16)', () => {
    it('with 3 death save failures cannot take damage, healing, temp HP or a rest, but can reset the death saves', async () => {
      const { user } = await openKael({ hpCurrent: 0, deathSaves: { successes: 0, failures: 3 } });
      await user.type(screen.getByLabelText('Amount'), '3');
      for (const name of [/Damage/, /Heal/, /Set temp HP/, 'Short Rest', 'Long Rest']) {
        expect(screen.getByRole('button', { name }).hasAttribute('disabled'), String(name)).toBe(true);
      }
      expect(screen.getByRole('button', { name: 'Reset' }).hasAttribute('disabled')).toBe(false);
      expect(screen.getByRole('button', { name: 'Undo last change' })).toBeTruthy();
      await user.click(screen.getByRole('button', { name: 'Reset' }));
      expect(screen.getByRole('button', { name: /Damage/ }).hasAttribute('disabled')).toBe(false);
    });

    it('at Exhaustion 6 the rests are disabled too, and Exhaustion can still be lowered', async () => {
      const { user } = await openKael({ hpCurrent: 40, exhaustion: 6 });
      await user.type(screen.getByLabelText('Amount'), '3');
      for (const name of [/Damage/, /Heal/, /Set temp HP/, 'Short Rest', 'Long Rest']) {
        expect(screen.getByRole('button', { name }).hasAttribute('disabled'), String(name)).toBe(true);
      }
      expect(screen.queryByText('Resting needs at least 1 HP.')).toBeNull();
      expect(screen.getByRole('button', { name: 'Reset' }).hasAttribute('disabled')).toBe(false);
      await user.click(screen.getByRole('button', { name: 'Exhaustion −1' }));
      expect(screen.getByRole('button', { name: 'Short Rest' }).hasAttribute('disabled')).toBe(false);
      expect(screen.getByRole('button', { name: /Damage/ }).hasAttribute('disabled')).toBe(false);
    });
  });
});
