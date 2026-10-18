// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Rng } from '../../dice/dice';
import { renderWithProviders } from '../testing/render';
import { DiceProvider, useDice } from './DiceContext';
import { DicePanel } from './DicePanel';

/** Every die lands on the face just above its middle: d6 -> 4, d8 -> 5, d20 -> 11. */
const middle: Rng = () => 0.5;

function Rollers() {
  const dice = useDice();
  return (
    <>
      <button type="button" onClick={() => dice.rollD20('Longsword: attack', 5)}>
        attack
      </button>
      <button type="button" onClick={() => dice.roll('Longsword: damage', '1d8+3', { damage: true })}>
        damage
      </button>
    </>
  );
}

/** Real dice are on by default; `appRolls` switches them off for the tests of the app's own rolls. */
async function openPanel({ appRolls = false } = {}) {
  renderWithProviders(
    <DiceProvider rng={middle}>
      <Rollers />
      <DicePanel />
    </DiceProvider>,
  );
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Dice' }));
  if (appRolls) await user.click(screen.getByLabelText('I roll real dice'));
  return user;
}

describe('dice panel', () => {
  it('rolls free notation and shows each die', async () => {
    const user = await openPanel({ appRolls: true });
    await user.type(screen.getByLabelText('Dice notation'), '2d6+3');
    await user.click(screen.getByRole('button', { name: 'Roll' }));
    expect(screen.getAllByText('2d6+3: 4 + 4 + 3').length).toBeGreaterThan(0);
  });

  it('a d20 test with Advantage shows both dice', async () => {
    const user = await openPanel({ appRolls: true });
    await user.click(screen.getByRole('button', { name: 'Advantage' }));
    await user.click(screen.getByRole('button', { name: 'attack' }));
    expect(screen.getAllByText('d20 Advantage (11, 11) +5').length).toBeGreaterThan(0);
  });

  it('Critical doubles the damage dice once and then switches off', async () => {
    const user = await openPanel({ appRolls: true });
    await user.click(screen.getByRole('button', { name: 'Critical' }));
    await user.click(screen.getByRole('button', { name: 'damage' }));
    expect(screen.getAllByText('1d8+3: 5 + 5 + 3').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Critical' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('shows a message for notation it cannot roll, instead of rolling something else', async () => {
    const user = await openPanel({ appRolls: true });
    await user.type(screen.getByLabelText('Dice notation'), '2d6 3');
    await user.click(screen.getByRole('button', { name: 'Roll' }));
    expect(await screen.findByText('Cannot roll "2d6 3"')).toBeTruthy();
  });

  it('starts with real dice on', async () => {
    await openPanel();
    expect(screen.getByLabelText('I roll real dice')).toHaveProperty('checked', true);
  });

  it('with real dice, asks for the d20 the player rolled and adds the bonus', async () => {
    const user = await openPanel();
    await user.click(screen.getByRole('button', { name: 'attack' }));
    const dialog = await screen.findByRole('dialog', { name: 'Longsword: attack' });
    await user.type(within(dialog).getByLabelText('d20'), '17');
    expect(within(dialog).getByText('22')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'Fill in' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getAllByText('d20 (17) +5 · own roll').length).toBeGreaterThan(0);
  });

  it('with real dice and Advantage, asks for both d20s and keeps the higher', async () => {
    const user = await openPanel();
    await user.click(screen.getByRole('button', { name: 'Advantage' }));
    await user.click(screen.getByRole('button', { name: 'attack' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('d20 (1)'), '4');
    await user.type(within(dialog).getByLabelText('d20 (2)'), '15{Enter}');
    expect(screen.getAllByText('d20 Advantage (4, 15) +5 · own roll').length).toBeGreaterThan(0);
  });

  it('with real dice, a Critical Hit asks for the doubled damage dice and refuses an impossible total', async () => {
    const user = await openPanel();
    await user.click(screen.getByRole('button', { name: 'Critical' }));
    await user.click(screen.getByRole('button', { name: 'damage' }));
    const dialog = await screen.findByRole('dialog');
    const field = within(dialog).getByLabelText('2d8');
    await user.type(field, '17');
    expect(within(dialog).getByText('Can only be 2 to 16')).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Fill in' })).toHaveProperty('disabled', true);
    await user.clear(field);
    await user.type(field, '11{Enter}');
    expect(screen.getAllByText('1d8+3: 11 + 3 · own roll').length).toBeGreaterThan(0);
  });

  it('with real dice, the app can still roll one, and Cancel rolls nothing', async () => {
    const user = await openPanel();
    await user.click(screen.getByRole('button', { name: 'attack' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Let the app roll' }));
    expect(screen.getAllByText('d20 (11) +5').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'damage' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText(/1d8\+3/)).toBeNull();
  });
});
