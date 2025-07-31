import { TextField } from 'components/base';
import { AddressAutocompleteProps } from '../AddressAutocomplete';

export const AddressAutocomplete = (props: AddressAutocompleteProps) => (
  <>
    <TextField
      error={props.error}
      helperText={props.helperText}
      id={props.id}
      label={props.label}
      name={props.name}
      onChange={props.onChange}
      required={props.required}
      value={props.value}
    />
    <button
      onClick={() =>
        props.onSelectPlace({
          address: 'mock-selected-address',
          city: 'mock-selected-city',
          countryIsoCode: 'mock-selected-country-code',
          state: 'mock-selected-state',
          zip: 'mock-selected-zip'
        })
      }
    >
      onSelectPlace
    </button>
  </>
);

export default AddressAutocomplete;
