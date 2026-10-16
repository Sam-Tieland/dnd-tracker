// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SRD_ATTRIBUTION } from '../../content/srd/attribution';
import { loadSettings } from '../../storage/settings';
import { renderApp } from '../testing/render';

describe('settings and credits', () => {
  it('switches the language and the theme, and remembers them', async () => {
    const { db } = renderApp('#/settings');
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('Language'), 'nl');
    expect(await screen.findByRole('heading', { name: 'Instellingen' })).toBeTruthy();
    await user.selectOptions(screen.getByLabelText('Thema'), 'dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    await waitFor(async () => expect(await loadSettings(db)).toMatchObject({ language: 'nl', theme: 'dark' }));
  });

  it('credits show the SRD attribution verbatim', async () => {
    renderApp('#/credits');
    expect((await screen.findByText(SRD_ATTRIBUTION)).textContent).toBe(SRD_ATTRIBUTION);
  });
});
