import { KeyboardArrowDown } from '@material-ui/icons';
import { Autocomplete as MuiAutocomplete, AutocompleteProps as MuiAutocompleteProps } from '@material-ui/lab';
import styled from 'styled-components';
import TextField, { TextFieldProps } from '../TextField/TextField';

// What's going on with this type?
//
// OptionType is the type that the options in the select have. Your
// `getOptionLabel` prop will take one as an argument and return a React node
// corresponding to what the user will see. This allows you to render more than
// just plain text as a label.
//
// We lock other generics on our own props to (in order of the generic type):
//
// 1. Not allow multiple selections
// 2. Not allow clearing the input once a selection is made
// 3. Not allow the user to enter any value
//
// It can help to look at the type definition for the MUI component to
// understand better. For example, allowing `disableClearable` will change the
// type of `value`.

type NarrowedMuiAutocompleteProps<OptionType> = Omit<
  MuiAutocompleteProps<OptionType, false, true, false>,
  'disableClearable' | 'freeSolo' | 'multiple' | 'renderInput'
>;

export interface SearchableSelectProps<OptionType> extends NarrowedMuiAutocompleteProps<OptionType> {
  error?: TextFieldProps['error'];
  helperText?: TextFieldProps['helperText'];
  label: TextFieldProps['label'];
  name?: TextFieldProps['name'];
  renderInput?: MuiAutocompleteProps<OptionType, false, true, false>['renderInput'];
  required?: TextFieldProps['required'];
}

const StyledAutocomplete = styled(MuiAutocomplete)`
  && {
    .NreAutocompleteEndAdornment {
      right: 13px;
    }

    .NreAutocompleteInput {
      /* Override the autocomplete default styling. */
      border: 1.5px solid rgb(196, 196, 196);
      border-radius: 4px;
      padding: 12px 16px;

      &:focus {
        border-color: rgb(0, 191, 223);
      }
    }

    .Mui-error .NreAutocompleteInput {
      border-color: rgb(200, 32, 63);
    }

    .NreAutocompleteInputRoot {
      /* Move the down arrow into the field outline. */
      padding-right: 0;
    }

    .NreAutocompleteInputLabelRoot {
      /* Override the autocomplete default styling and force labels to be static. */
      color: rgb(40, 40, 40);
      font: 600 16px Roboto, sans-serif;
      position: static;
      transform: none;

      &.Mui-error {
        color: rgb(200, 32, 63);
      }
    }

    .NreAutocompleteInputUnderline::before,
    .NreAutocompleteInputUnderline::after {
      /* Hide the underline as we do with TextField. */
      display: none;
    }
  }
` as typeof MuiAutocomplete;

// The cast above is needed to maintain generics on Autocomplete.
// See https://github.com/styled-components/styled-components/issues/1803

export function SearchableSelect<OptionType>(props: SearchableSelectProps<OptionType>) {
  const { error, helperText, label, name, required, innerRef, ...other } = props;

  // Autocomplete is disabled in the TextField component because in practice,
  // what seems to happen is that browser autofill will enter a value in the
  // text field, but the component will show completions only instead of
  // selecting the relevant option. See CountrySelect for an approach on
  // handling autofill.

  return (
    <StyledAutocomplete
      classes={{ endAdornment: 'NreAutocompleteEndAdornment' }}
      disableClearable
      popupIcon={<KeyboardArrowDown />}
      renderInput={(params) => (
        <TextField
          {...params}
          error={error}
          helperText={helperText}
          inputProps={{ ...params.inputProps, className: 'NreAutocompleteInput', autoComplete: 'none' }}
          InputLabelProps={{
            ...params.InputLabelProps,
            classes: { asterisk: 'NreAutocompleteInputLabelAsterisk', root: 'NreAutocompleteInputLabelRoot' }
          }}
          InputProps={{
            ...params.InputProps,
            classes: { root: 'NreAutocompleteInputRoot', underline: 'NreAutocompleteInputUnderline' }
          }}
          label={label}
          name={name}
          required={required}
          {...(innerRef && { ref: innerRef })}
        />
      )}
      {...other}
    />
  );
}

export default SearchableSelect;
