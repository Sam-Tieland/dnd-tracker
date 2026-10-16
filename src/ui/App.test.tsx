// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Section } from './components/ErrorBoundary';
import { renderApp, renderWithProviders, testDb } from './testing/render';

describe('app shell', () => {
  it('loads the data and starts on the character list', async () => {
    renderApp('#/');
    expect(await screen.findByRole('heading', { name: 'Characters' })).toBeTruthy();
  });

  it('shows a message instead of loading forever when the storage cannot be read', async () => {
    const db = testDb();
    vi.spyOn(db.settings, 'get').mockRejectedValue(new Error('blocked'));
    renderApp('#/', db);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Kan de opslag niet openen.');
    expect(alert.textContent).toContain('Could not open storage.');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('a failing save of the persistence flag does not break the app', async () => {
    const db = testDb();
    const put = vi.spyOn(db.settings, 'put').mockRejectedValue(new Error('quota'));
    renderApp('#/', db);
    expect(await screen.findByRole('heading', { name: 'Characters' })).toBeTruthy();
    await waitFor(() => expect(put).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('an error in one part shows a message with an export button; the rest keeps working', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Boom = () => {
      throw new Error('boom');
    };
    renderWithProviders(
      <>
        <Section>
          <Boom />
        </Section>
        <p>Still here</p>
      </>,
    );
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export all data' })).toBeTruthy();
    expect(screen.getByText('Still here')).toBeTruthy();
  });
});
