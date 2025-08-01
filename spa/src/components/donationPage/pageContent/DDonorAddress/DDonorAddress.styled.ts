import styled from 'styled-components';
import { CountrySelect as BaseCountrySelect, TextField as BaseTextField, Button as BaseButton } from 'components/base';

// Our select uses the new text field (under components/base) for display. For
// the time being, we make it look like the old text fields on the rest of the
// contribution page (which use elements/inputs).

export const CountrySelect = styled(BaseCountrySelect)`
  /* Three &s here to win the specificity battle with the base styles of SearchableSelect :( */
  &&& {
    .NreAutocompleteInputLabelRoot,
    .Mui-error .NreAutocompleteInputLabelRoot {
      color: rgb(40, 40, 40);
      font-weight: 500;
      margin-bottom: 0.5em;
    }

    .NreAutocompleteInputRoot {
      margin-top: 0;

      &:before {
        display: none;
      }
    }

    .NreAutocompleteInput {
      background: ${({ theme }) => theme.colors.cstm_inputBackground};
      border: 1px solid #080708;
      border-color: ${({ theme }) => theme.colors.cstm_inputBorder};
      border-radius: 3px;
      height: 19px;

      &:focus {
        border-color: ${({ theme }) => theme.colors.cstm_CTAs};
        /* Imitate the outline border on text fields in the name section. */
        box-shadow: inset 0 0 0 1px ${({ theme }) => theme.colors.cstm_CTAs};
      }
    }

    .NreTextFieldFormHelperTextRoot.Mui-error {
      font-size: 14px;
      background: none;
      color: rgb(255, 71, 108);
      margin: 0;
      padding: 0;
    }

    .NreAutocompleteInputLabelAsterisk {
      color: #ff476c;
    }
  }
`;

// Same issue as with the country select--we style text fields here to match the
// existing appearance.

export const TextField = styled(BaseTextField)`
  && {
    .NreTextFieldInputLabelFormControl,
    .Mui-error.NreTextFieldInputLabelFormControl {
      color: rgb(40, 40, 40);
      font-weight: 500;
      margin-top: 0;
      margin-bottom: 2px;
    }

    .NreTextFieldInput,
    .Mui-error .NreTextFieldInput {
      background: ${({ theme }) => theme.colors.cstm_inputBackground};
      border: 1px solid #080708;
      border-color: ${({ theme }) => theme.colors.cstm_inputBorder};
      border-radius: 3px;
      height: 19px;

      &:focus {
        border-color: ${({ theme }) => theme.colors.cstm_CTAs};
        /* Imitate the outline border on text fields in the name section. */
        box-shadow: inset 0 0 0 1px ${({ theme }) => theme.colors.cstm_CTAs};
      }
    }

    .NreTextFieldInputLabelAsterisk {
      color: #ff476c;
    }

    .NreTextFieldFormHelperTextRoot.Mui-error {
      font-size: 14px;
      background: none;
      color: rgb(255, 71, 108);
      margin: 0;
      padding: 0;
    }
  }
`;

export const Button = styled(BaseButton)<{ $showComplement: boolean }>`
  && {
    margin-top: 8px;
    font-weight: 500;
    text-transform: none;
    text-decoration: underline;
    background: none;
    border-color: white;
    box-shadow: none;
    padding: 0;
    height: unset;

    .NreButtonLabel {
      color: ${({ theme }) => theme.colors.muiGrey[900]};

      ${({ $showComplement, theme }) => $showComplement && `color: ${theme.colors.muiGrey[600]};`}
    }

    &:hover,
    &:active,
    &:hover:active {
      box-shadow: none;
      background: transparent;
      text-decoration: underline;
    }

    &:disabled {
      background-color: unset;
    }
  }
`;

export const CollapseChild = styled.div`
  width: 100%;
  padding: 12px;
`;
