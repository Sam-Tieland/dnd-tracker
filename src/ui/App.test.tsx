// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Section } from './components/ErrorBoundary';
import { renderApp, renderWithProviders } from './testing/render';

describe('app shell', () => {
  it('loads the data and shows the app', async () => {
    renderApp('#/');
    expect(await screen.findByRole('heading', { name: 'D&D Character Tracker' })).toBeTruthy();
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
