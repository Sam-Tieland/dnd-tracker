// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import '../testing/render';
import { ListInput } from './ListInput';

function Harness({ onList }: { onList: (list: string[]) => void }) {
  const [list, setList] = useState<string[]>([]);
  return (
    <>
      <ListInput
        aria-label="List"
        value={list}
        onCommit={(next) => {
          setList(next);
          onList(next);
        }}
      />
      <button type="button" onClick={() => setList(['Elvish', 'Gnomish'])}>
        Replace
      </button>
    </>
  );
}

describe('ListInput', () => {
  it('commits on every change and keeps the typed text, commas and spaces included', async () => {
    const lists: string[][] = [];
    render(<Harness onList={(list) => lists.push(list)} />);
    const input = screen.getByLabelText('List') as HTMLInputElement;
    await userEvent.setup().type(input, 'Common, ');
    expect(input.value).toBe('Common, ');
    expect(JSON.stringify(lists.at(-1))).toBe(JSON.stringify(['Common']));
  });

  it('shows the normalised list when the field is left', async () => {
    render(<Harness onList={() => {}} />);
    const input = screen.getByLabelText('List') as HTMLInputElement;
    await userEvent.setup().type(input, ' Common ,  Dwarvish , ');
    fireEvent.blur(input);
    expect(input.value).toBe('Common, Dwarvish');
  });

  it('shows a list that was changed from outside', async () => {
    render(<Harness onList={() => {}} />);
    const input = screen.getByLabelText('List') as HTMLInputElement;
    await userEvent.setup().type(input, 'Common');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Replace' }));
    expect(input.value).toBe('Elvish, Gnomish');
  });
});
