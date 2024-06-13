import countryCodes from 'country-code-lookup';
import { Select } from '../Select';
import { TextField, TextFieldProps } from './TextField';
import { CountryIso2, FlagImage, usePhoneInput } from 'react-international-phone';
import styled from 'styled-components';
import { InputAdornment } from '@material-ui/core';

export type PhoneTextFieldProps = TextFieldProps;

const StyledSelect = styled(Select)`
  && {
    .NreSelectNotchedOutline {
      border: 1.5px solid ${({ theme }) => theme.basePalette.greyscale.grey2};
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

export function PhoneTextField(props: PhoneTextFieldProps) {
  const { inputValue, handlePhoneValueChange, inputRef, country, setCountry } = usePhoneInput({
    defaultCountry: 'us',
    disableCountryGuess: true,
    forceDialCode: true,
    value: props.value as string | undefined,
    onChange: (data) => {
      // FIXME if we use this component, should work OK in uncontrolled mode
      console.log('onChange', data);
    }
  });

  return (
    <div>
      <TextField
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
                    <FlagImage iso2={(value as CountryIso2).toLowerCase()} style={{ width: 24 }} />
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
        {...props}
      />
    </div>
  );
}

export default PhoneTextField;
