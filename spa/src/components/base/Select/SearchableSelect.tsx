import { ComponentProps } from 'react';
// TODO: [DEV-2679] Replace react-select with MUI Autocomplete
import Select from 'react-select';
import styled from 'styled-components';

export type SearchableSelectProps = Partial<ComponentProps<typeof Select>>;

const StyledSelect = styled(Select)`
  .react-select__control {
    border-color: #080708;
    border-radius: 3px;
    font-family: Roboto, sans-serif;
    font-weight: 400;
    height: 45px;
  }
  .react-select__option {
    font-family: Roboto, sans-serif;
    font-weight: 400;
    font-size: ${({theme: {fontSizes}}) => fontSizes[1] }
  }
`;

export function SearchableSelect(props: SearchableSelectProps) {
  return <StyledSelect menuIsOpen={true} classNamePrefix="react-select" closeMenuOnSelect isSearchable {...props} />;
}

// react-select does not appear to have prop types, so we can't set them on
// ourselves.

export default SearchableSelect;
