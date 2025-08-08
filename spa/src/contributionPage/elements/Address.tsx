import PropTypes, { InferProps } from 'prop-types';
import { Field, Fieldset, Label, Select, TextInput } from './common.styled';
import { Fields, OneUpField } from './Address.styled';

const AddressPropTypes = {
  city: PropTypes.string.isRequired,
  country: PropTypes.string.isRequired,
  state: PropTypes.string.isRequired,
  street: PropTypes.string.isRequired,
  zip: PropTypes.string.isRequired,
  onChangeCity: PropTypes.func.isRequired,
  onChangeCountry: PropTypes.func.isRequired,
  onChangeState: PropTypes.func.isRequired,
  onChangeStreet: PropTypes.func.isRequired,
  onChangeZip: PropTypes.func.isRequired
};

export interface AddressProps extends InferProps<typeof AddressPropTypes> {
  onChangeCity: (value: string) => void;
  onChangeCountry: (value: string) => void;
  onChangeState: (value: string) => void;
  onChangeStreet: (value: string) => void;
  onChangeZip: (value: string) => void;
}

export function Address({
  onChangeCity,
  onChangeCountry,
  onChangeState,
  onChangeStreet,
  onChangeZip,
  city,
  country,
  state,
  street,
  zip
}: AddressProps) {
  return (
    <Fieldset>
      <Fields>
        <OneUpField>
          <Label htmlFor="address-address">Address</Label>
          <TextInput
            id="address-address"
            type="text"
            onChange={(event) => onChangeStreet(event.target.value)}
            value={street}
          />
        </OneUpField>
        <OneUpField>
          <Label htmlFor="address-city">City</Label>
          <TextInput
            id="address-city"
            type="text"
            onChange={(event) => onChangeCity(event.target.value)}
            value={city}
          />
        </OneUpField>
        <Field>
          <Label htmlFor="address-state">State</Label>
          <TextInput
            id="address-state"
            type="text"
            onChange={(event) => onChangeState(event.target.value)}
            value={state}
          />
        </Field>
        <Field>
          <Label htmlFor="address-zip">Zip Code</Label>
          <TextInput id="address-zip" type="text" onChange={(event) => onChangeZip(event.target.value)} value={zip} />
        </Field>
        <Field>
          <Label htmlFor="address-country">Country</Label>
          <Select id="address-country" onChange={(event) => onChangeCountry(event.target.value)} value={country}>
            <option value="CA">Canada</option>
            <option value="US">United States</option>
          </Select>
        </Field>
      </Fields>
    </Fieldset>
  );
}

Address.propTypes = AddressPropTypes;
export default Address;
