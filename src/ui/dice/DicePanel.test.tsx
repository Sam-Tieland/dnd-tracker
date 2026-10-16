// @vitest-environment jsdom
import { screen } from '@testing-library/react';
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

async function openPanel() {
  renderWithProviders(
    <DiceProvider rng={middle}>
      <Rollers />
      <DicePanel />
    </DiceProvider>,
  );
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Dice' }));
  return user;
}

describe('dice panel', () => {
  it('rolls free notation and shows each die', async () => {
    const user = await openPanel();
    await user.type(screen.getByLabelText('Dice notation'), '2d6+3');
    await user.click(screen.getByRole('button', { name: 'Roll' }));
    expect(screen.getAllByText('2d6+3: 4 + 4 + 3').length).toBeGreaterThan(0);
  });

  it('a d20 test with Advantage shows both dice', async () => {
    const user = await openPanel();
    await user.click(screen.getByRole('button', { name: 'Advantage' }));
    await user.click(screen.getByRole('button', { name: 'attack' }));
    expect(screen.getAllByText('d20 Advantage (11, 11) +5').length).toBeGreaterThan(0);
  });

  it('Critical doubles the damage dice once and then switches off', async () => {
    const user = await openPanel();
    await user.click(screen.getByRole('button', { name: 'Critical' }));
    await user.click(screen.getByRole('button', { name: 'damage' }));
    expect(screen.getAllByText('1d8+3: 5 + 5 + 3').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Critical' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('shows a message for notation it cannot roll, instead of rolling something else', async () => {
    const user = await openPanel();
    await user.type(screen.getByLabelText('Dice notation'), '2d6 3');
    await user.click(screen.getByRole('button', { name: 'Roll' }));
    expect(await screen.findByText('Cannot roll "2d6 3"')).toBeTruthy();
  });
});
