import { ChangeEvent, useState } from 'react';
import { EditorBlockProps } from '../EditorBlock';

export const EditorBlock = ({ initialValue, label, onFocus, onChange, onSelectionUpdate }: EditorBlockProps) => {
  const [value, setValue] = useState(initialValue);

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setValue(event.target.value);
    onChange(event.target.value);
  }

  return (
    <textarea
      aria-label={label}
      onFocus={() => onFocus?.({ editor: { label, state: { selection: {} } } } as any)}
      onChange={handleChange}
      onSelect={() => onSelectionUpdate?.({ editor: { label, state: { selection: {} } } } as any)}
      value={value}
    />
  );
};

export default EditorBlock;
