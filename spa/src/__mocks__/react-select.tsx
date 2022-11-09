// This mocks react-select into a vanilla <select> to make testing easier. It
// doesn't suport all of react-select's functionality, naturally.
//
// See https://polvara.me/posts/testing-a-custom-select-with-react-testing-library

import { ChangeEvent } from 'react';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  inputId?: string;
  onChange: (value?: SelectOption) => void;
  options: SelectOption[];
  value: string;
}

const Select = ({ inputId, options, value, onChange }: SelectProps) => {
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const option = options.find((option) => option.value === event.currentTarget.value);
    onChange(option);
  }
  return (
    <select id={inputId} value={value} onChange={handleChange}>
      {options.map(({ label, value }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
};

export default Select;
