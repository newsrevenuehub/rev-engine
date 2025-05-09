import countryCodes from 'country-code-lookup';
import { Select } from '../Select';
import { TextField, TextFieldProps } from './TextField';
import { CountryIso2, FlagImage, usePhoneInput } from 'react-international-phone';
import styled from 'styled-components';
import { InputAdornment } from '@material-ui/core';

export type PhoneTextFieldProps = Omit<TextFieldProps, 'onChange'> & {
  onChange?: (value: string) => void;
  value?: string;
};

const StyledSelect = styled(Select)`
  && {
    .NreSelectNotchedOutline {
      border: 1.5px solid ${({ theme }) => theme.basePalette.greyscale['30']};
    }

    .NreTextFieldInput {
      border: 1.5px solid transparent;
      height: 46px;
    }

    .NreSelectMenu {
      border-color: transparent;
      min-width: 30px;
    }
  }
`;

// Borrowed from https://react-international-phone.vercel.app/docs/Advanced%20Usage/useWithUiLibs
export function PhoneTextField({ onChange, value, ...props }: PhoneTextFieldProps) {
  const { inputValue, handlePhoneValueChange, inputRef, country, setCountry } = usePhoneInput({
    defaultCountry: 'us',
    forceDialCode: true,
    value,
    onChange: (data) => {
      onChange?.(data.phone);
    }
  });

  return (
    <TextField
      {...props}
      InputProps={{
        classes: { root: 'NreTextFieldInputRoot', underline: 'NreTextFieldInputUnderline' } as any,
        startAdornment: (
          <InputAdornment position="start">
            <StyledSelect
              onChange={(event) => setCountry(event.target.value.toLowerCase())}
              options={countryCodes.countries.map((code) => ({ label: code.country, value: code.iso2 }))}
              SelectProps={{
                classes: { selectMenu: 'NreSelectMenu' },
                renderValue: (value) => (
                  <FlagImage alt={`${value} icon`} iso2={(value as CountryIso2).toLowerCase()} style={{ width: 24 }} />
                )
              }}
              value={country.iso2.toUpperCase()}
            />
          </InputAdornment>
        )
      }}
      inputRef={inputRef}
      onChange={handlePhoneValueChange}
      type="tel"
      value={inputValue}
    />
  );
}

export default PhoneTextField;
