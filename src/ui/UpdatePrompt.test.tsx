// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { reloads, stubUpdateWaiting } from './testing/pwa-register-stub';
import { renderApp } from './testing/render';

describe('update prompt', () => {
  afterEach(() => stubUpdateWaiting(false));

  it('stays hidden without a new version', async () => {
    renderApp('#/');
    await screen.findByRole('heading', { name: 'Characters' });
    expect(screen.queryByText('A new version is available.')).toBeNull();
  });

  it('announces a new version and reloads only when the player taps (spec §13)', async () => {
    stubUpdateWaiting(true);
    renderApp('#/');
    expect(await screen.findByText('A new version is available.')).toBeTruthy();
    expect(reloads).toEqual([]);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reload' }));
    expect(reloads).toEqual([true]);
  });
});
