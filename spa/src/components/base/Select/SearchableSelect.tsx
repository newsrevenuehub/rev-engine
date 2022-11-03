import { ComponentProps, useMemo } from 'react';
// TODO: [DEV-2679] Replace react-select with MUI Autocomplete
import Select, { StylesConfig } from 'react-select';

export type SearchableSelectProps = Partial<ComponentProps<typeof Select>>;

const fontStyles = {
  fontFamily: 'Roboto, sans-serif',
  fontSize: 16,
  fontWeight: 400
};

export function SearchableSelect(props: SearchableSelectProps) {
  // We reproduce styles that are shared by other inputs in the form. Other inputs
  // use styled-components, but that's not straightforward to integrate with react-select,
  // so here we manually override its styles.

  const styles = useMemo<StylesConfig>(
    () => ({
      control: (provided) => ({
        ...provided,
        height: '45px',
        borderRadius: '3px',
        borderColor: '#080708',
        '&:hover': { borderColor: 'inherit' }
      }),
      valueContainer: (provided) => ({ ...provided, ...fontStyles }),
      option: (provided) => ({ ...provided, ...fontStyles })
    }),
    []
  );

  return <Select classNamePrefix="react-select" closeMenuOnSelect isSearchable styles={styles} {...props} />;
}

// react-select does not appear to have prop types, so we can't set them on
// ourselves.

export default SearchableSelect;
