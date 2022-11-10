import styled from 'styled-components';
import Input from 'elements/inputs/Input';
import { CountrySelect as BaseCountrySelect } from 'components/base';

export const ConditionallyHiddenInput = styled(Input)<{ show?: boolean }>`
  display: ${(props) => (props.show ? 'block' : 'none')};
`;

// Our select uses the new text field (under components/base) for display. For
// the time being, we make it look like the old text fields on the rest of the
// contribution page (which use elements/inputs).

export const CountrySelect = styled(BaseCountrySelect)`
  && {
    [class*='MuiAutocomplete-inputRoot'] {
      margin-top: 0;

      [class*='MuiAutocomplete-input'] {
        border: 1px solid #080708;
        height: 19px;
      }
    }
  }
`;
