import { useEffect, useState, type InputHTMLAttributes } from 'react';
import { parseList } from './form-logic';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & { value: string[]; onCommit: (list: string[]) => void };

const sameList = (a: string[], b: string[]) => JSON.stringify(a) === JSON.stringify(b);

/**
 * A comma-separated list. The field keeps the raw text, so the player can type commas and spaces freely, while every
 * change is committed as a list: nothing is lost when the form is saved without leaving the field first (a tap on
 * Save does not always blur it on a phone). Leaving the field shows the list in its tidy form.
 */
export function ListInput({ value, onCommit, onBlur, ...rest }: Props) {
  const [text, setText] = useState(value.join(', '));
  // A list changed from outside updates the field; the list this field committed itself does not rewrite the typing.
  useEffect(() => setText((current) => (sameList(parseList(current), value) ? current : value.join(', '))), [value]);
  return (
    <input
      {...rest}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        onCommit(parseList(event.target.value));
      }}
      onBlur={(event) => {
        setText(value.join(', '));
        onBlur?.(event);
      }}
    />
  );
}
