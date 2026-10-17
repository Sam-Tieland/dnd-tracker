// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { kael } from '../../rules/testing/fixtures';
import { loadCharacter, saveCharacter } from '../../storage/characters';
import { renderApp, testDb } from '../testing/render';

async function openKael(patch: Parameters<typeof kael>[0] = {}) {
  const db = testDb();
  await saveCharacter(db, kael({ ...patch, state: { hpCurrent: 40 } }));
  renderApp('#/c/test', db);
  await screen.findByTestId('hp');
  return { db, user: userEvent.setup() };
}

describe('actions tab', () => {
  it('rolls attacks and counts down resources and spell slots', async () => {
    const { db, user } = await openKael({ choices: { spells: [{ classId: 'srd:class:wizard', spellId: 'srd:spell:fire-bolt', prepared: true }] } });
    await user.click(screen.getByRole('button', { name: 'Longsword: attack +6' }));
    expect(screen.getAllByText('Longsword: attack').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Fire Bolt: damage 2d10' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Use Second Wind' }));
    expect(screen.getByText('Second Wind 1/2')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Level 1 slot 1' }));
    expect(screen.getByRole('button', { name: 'Level 1 slot 1' }).getAttribute('aria-pressed')).toBe('true');
    // Slots are spent from the right: the spent coin is the last one in the row, the ones in hand stay on the left.
    const row = screen.getAllByRole('button', { name: /^Level 1 slot/ }).map((b) => b.getAttribute('aria-pressed'));
    expect(row.at(-1)).toBe('true');
    expect(row.slice(0, -1).every((p) => p === 'false')).toBe(true);
    await waitFor(async () =>
      expect((await loadCharacter(db, 'test'))?.state).toMatchObject({ resourcesUsed: { 'second-wind': 1 }, slotsUsed: { '1': 1 } }),
    );
  });
});

describe('spells panel', () => {
  it('shows the caster stats and adds and prepares a class spell', async () => {
    const { db, user } = await openKael();
    // From iPad portrait up the spells have their own card next to the tabs, not a tab of their own.
    expect(screen.queryByRole('tab', { name: 'Spells' })).toBeNull();
    expect(within(screen.getByRole('region', { name: 'Spells' })).getByText('Intelligence · Spell Attack +5 · Spell Save DC 13')).toBeTruthy();
    await user.selectOptions(screen.getByLabelText('Add a Wizard spell'), 'srd:spell:magic-missile');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('Magic Missile')).toBeTruthy();
    await user.click(screen.getByLabelText('Magic Missile prepared'));
    await waitFor(async () =>
      expect((await loadCharacter(db, 'test'))?.choices.spells).toEqual([{ classId: 'srd:class:wizard', spellId: 'srd:spell:magic-missile', prepared: false }]),
    );
  });

  it('adds a Magic Initiate cantrip with the ability chosen for the feat', async () => {
    const { db, user } = await openKael();
    await user.selectOptions(screen.getByLabelText('Spell list'), 'srd:class:cleric');
    await user.selectOptions(screen.getByLabelText('Spellcasting ability'), 'wis');
    await user.selectOptions(screen.getByLabelText('Spell'), 'srd:spell:sacred-flame');
    await user.click(screen.getByRole('button', { name: 'Add spell from a feat' }));
    await waitFor(async () =>
      expect((await loadCharacter(db, 'test'))?.choices.spells).toEqual([
        { classId: 'srd:class:cleric', spellId: 'srd:spell:sacred-flame', prepared: true, ability: 'wis' },
      ]),
    );
  });
});

describe('inventory tab', () => {
  it('adds an SRD item and an own item, equips armor and never stores an empty quantity', async () => {
    const { db, user } = await openKael({ inventory: [] });
    expect(screen.getByTestId('ac').textContent).toBe('11');
    await user.click(screen.getByRole('tab', { name: 'Inventory' }));
    await user.type(screen.getByLabelText('Search items or type a name'), 'chain mail');
    await user.click(screen.getByRole('button', { name: 'Chain Mail (Armor)' }));
    await user.click(screen.getByLabelText('Chain Mail equipped'));
    expect(screen.getByTestId('ac').textContent).toBe('17');
    await user.type(screen.getByLabelText('Search items or type a name'), 'Lucky coin');
    await user.click(screen.getByRole('button', { name: 'Add "Lucky coin" as your own item' }));
    const qty = screen.getByLabelText('Quantity of Lucky coin');
    await user.clear(qty);
    await user.tab();
    expect((qty as HTMLInputElement).value).toBe('1');
    await waitFor(async () =>
      expect((await loadCharacter(db, 'test'))?.inventory.map((i) => [i.customName ?? i.itemId, i.qty, i.equipped])).toEqual([
        ['srd:armor:chain-mail', 1, true],
        ['Lucky coin', 1, false],
      ]),
    );
  });
});

describe('features tab', () => {
  it('groups features with SRD text and adds an override that changes the AC', async () => {
    const { user } = await openKael();
    await user.click(screen.getByRole('tab', { name: 'Features' }));
    expect(screen.getByRole('heading', { name: 'Champion' })).toBeTruthy();
    expect(screen.getByText('Second Wind')).toBeTruthy();
    await user.selectOptions(screen.getByLabelText('Number'), 'ac');
    await user.type(screen.getByLabelText('Reason'), 'Ring of Protection');
    await user.click(screen.getByRole('button', { name: 'Add override' }));
    expect(screen.getByTestId('ac').textContent).toBe('20');
    expect(screen.getByText(/\+1 Ring of Protection \(override\)/)).toBeTruthy();
  });
});
