// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { kael } from '../../rules/testing/fixtures';
import { loadCharacter, saveCharacter } from '../../storage/characters';
import { renderApp, testDb } from '../testing/render';
import { resetUndoStacks, useCharacterSession, type SessionState } from './session';
import { Providers } from '../App';

afterEach(() => resetUndoStacks());

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('an Undo that outlives the sheet', () => {
  it('does nothing once the session is gone: the database keeps what the form saved', async () => {
    const db = testDb();
    await saveCharacter(db, kael({ state: { hpCurrent: 40 } }));
    let latest: SessionState | undefined;
    function Probe() {
      latest = useCharacterSession('test');
      return null;
    }
    const view = render(
      <Providers db={db}>
        <Probe />
      </Providers>,
    );
    await waitFor(() => expect(latest?.status).toBe('ready'));
    const stale = latest as Extract<SessionState, { status: 'ready' }>;
    act(() => stale.commit({ ...stale.character, state: { ...stale.character.state, hpCurrent: 33 } }, 'HP −7'));
    view.unmount();
    // The form (another session) saves a rename after the sheet was left.
    await waitFor(async () => expect((await loadCharacter(db, 'test'))?.state.hpCurrent).toBe(33));
    await saveCharacter(db, { ...(await loadCharacter(db, 'test'))!, name: 'Kael the Bold' });
    stale.undo();
    await sleep(600);
    expect(await loadCharacter(db, 'test')).toMatchObject({ name: 'Kael the Bold', state: { hpCurrent: 33 } });
  });
});

describe('toasts with an action', () => {
  it('disappear when the route changes', async () => {
    const db = testDb();
    await saveCharacter(db, kael({ state: { hpCurrent: 40 } }));
    renderApp('#/c/test', db);
    const user = userEvent.setup();
    await screen.findByTestId('hp');
    await user.type(screen.getByLabelText('Amount'), '7');
    await user.click(screen.getByRole('button', { name: /Damage/ }));
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy();
    act(() => {
      window.location.hash = '#/settings';
    });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull());
    expect(screen.queryByText('HP −7')).toBeNull();
  });
});
