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
  label: TextFieldProps['label'];
  name?: TextFieldProps['name'];
  renderInput?: MuiAutocompleteProps<OptionType, false, true, false>['renderInput'];
}

const StyledAutocomplete = styled(MuiAutocomplete)`
  &&[class*='MuiAutocomplete-hasPopupIcon'] [class*='MuiAutocomplete-inputRoot'] {
    /* Move the down arrow into the field outline. */
    padding-right: 0;
  }

  && {
    [class*='MuiAutocomplete-endAdornment'] {
      right: 13px;
    }

    [class*='MuiAutocomplete-inputRoot'][class*='MuiInput-root'] [class*='MuiAutocomplete-input']:first-child {
      /*
      Override padding being set by the base component and make it match
      what's in TextField. The complexity of this selector is to win specificity.
      */
      padding: 12px 16px;
    }

    [class*='MuiInputLabel-formControl'] {
      /* Remove style overrides and make it match TextField. */
      color: rgb(40, 40, 40);
      font: 600 16px Roboto, sans-serif;
      position: static;
      transform: none;
    }
  }
` as typeof MuiAutocomplete;

// The cast above is needed to maintain generics on Autocomplete.
// See https://github.com/styled-components/styled-components/issues/1803

export function SearchableSelect<OptionType>(props: SearchableSelectProps<OptionType>) {
  const { label, name, ...other } = props;

  return (
    <StyledAutocomplete
      disableClearable
      popupIcon={<KeyboardArrowDown />}
      renderInput={(params) => <TextField {...params} label={label} name={name} />}
      {...other}
    />
  );
}

export default SearchableSelect;
