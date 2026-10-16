import { useEffect, useState, type InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number;
  onChange: (value: number) => void;
};

/**
 * A number field the player can clear while typing: only numbers reach onChange, and leaving the field shows the
 * stored value again, so an empty or half-typed field never ends up in the character.
 */
export function NumberInput({ value, onChange, onBlur, ...rest }: Props) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <input
      {...rest}
      type="number"
      inputMode="numeric"
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        const number = Number(event.target.value);
        if (event.target.value.trim() !== '' && Number.isFinite(number)) onChange(number);
      }}
      onBlur={(event) => {
        setText(String(value));
        onBlur?.(event);
      }}
    />
  );
}
