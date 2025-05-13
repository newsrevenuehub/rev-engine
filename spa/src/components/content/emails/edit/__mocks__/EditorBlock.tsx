import { ChangeEvent, useState } from 'react';
import { EditorBlockProps } from '../EditorBlock';

export const EditorBlock = ({ initialValue, label, onFocus, onChange }: EditorBlockProps) => {
  const [value, setValue] = useState(initialValue);

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setValue(event.target.value);
    onChange(event.target.value);
  }

  return (
    <textarea
      aria-label={label}
      onFocus={() => onFocus?.({ editor: { label } } as any)}
      onChange={handleChange}
      value={value}
    />
  );
};

export default EditorBlock;
