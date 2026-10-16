import { useEffect, useState, type InputHTMLAttributes } from 'react';
import { parseList } from './form-logic';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & { value: string[]; onCommit: (list: string[]) => void };

/** A comma-separated list, read when the field is left, so the player can type commas freely. */
export function ListInput({ value, onCommit, ...rest }: Props) {
  const [text, setText] = useState(value.join(', '));
  useEffect(() => setText(value.join(', ')), [value]);
  return <input {...rest} value={text} onChange={(event) => setText(event.target.value)} onBlur={() => onCommit(parseList(text))} />;
}
