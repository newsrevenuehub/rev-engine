import PropTypes from 'prop-types';
import { usePlacesWidget } from 'react-google-autocomplete';
import { useFormContext } from 'react-hook-form';

import { HUB_GOOGLE_MAPS_API_KEY } from 'settings';
import LabeledInput from 'elements/inputs/LabeledInput';
import clsx from 'clsx';

function Address({
  streetAddressInputName,
  streetAddressLabelText,
  streetAddressRequired,
  cityInputName,
  cityLabelText,
  cityRequired,
  stateInputName,
  stateLabelText,
  stateRequired,
  zipInputName,
  zipLabelText,
  zipRequired,
  countryInputName,
  countryLabelText,
  countryRequired
}) {
  const { setValue } = useFormContext();

  // Google Maps Widget API integration. This will enable display of an
  // autcomplete address widget. When the user selects a value, we set our
  // address fields based on a subset of returned data.
  const { ref } = usePlacesWidget({
    apiKey: HUB_GOOGLE_MAPS_API_KEY,
    options: {
      types: ['address']
    },
    // map Google Maps address components to subset of our address component fields
    onPlaceSelected: ({ address_components: addressComponents }) => {
      const streetAddressNumber = addressComponents.find(({ types }) => types.includes('street_number'));
      const streetName = addressComponents.find(({ types }) => types.includes('route'));
      const updatedStreetAddress = `${streetAddressNumber ? streetAddressNumber.long_name : ''}${
        streetAddressNumber && streetName ? ' ' : ''
      }${streetName ? streetName.long_name : ''}`;
      const updates = {
        [streetAddressInputName]: updatedStreetAddress ? { long_name: updatedStreetAddress } : undefined,
        [cityInputName]: addressComponents.find(({ types }) => types.includes('locality')),
        [stateInputName]: addressComponents.find(({ types }) => types.includes('administrative_area_level_1')),
        [countryInputName]: addressComponents.find(({ types }) => types.includes('country')),
        [zipInputName]: addressComponents.find(({ types }) => types.includes('postal_code'))
      };
      Object.entries(updates)
        .filter((item) => item !== undefined)
        .forEach(([formInput, { long_name: value }]) => {
          setValue(formInput, value);
        });
    }
  });

  const topInputsCommonClasses = 'w-full';
  return (
    <fieldset className={clsx('w-full flex flex-col items-center')}>
      <LabeledInput
        className={clsx(topInputsCommonClasses)}
        name={streetAddressInputName}
        labelText={streetAddressLabelText}
        required={streetAddressRequired}
        passedRef={ref}
      />
      <LabeledInput
        className={clsx(topInputsCommonClasses)}
        name={cityInputName}
        labelText={cityLabelText}
        required={cityRequired}
      />
      <div className={clsx('flex flex-col w-full max-w-full	items-center md:flex-row gap-2')}>
        <LabeledInput name={stateInputName} labelText={stateLabelText} required={stateRequired} />
        <LabeledInput name={zipInputName} labelText={zipLabelText} required={zipRequired} />
        <LabeledInput name={countryInputName} labelText={countryLabelText} required={countryRequired} />
      </div>
    </fieldset>
  );
}

Address.type = 'DDonorAddress';
Address.displayName = 'Donor address';
Address.description = 'Collect donor address';
Address.required = true;
Address.unique = true;

Address.propTypes = {
  streetAddressInputName: PropTypes.string.isRequired,
  streetAddressLabelText: PropTypes.string.isRequired,
  streetAddressRequired: PropTypes.bool.isRequired,
  cityInputName: PropTypes.string.isRequired,
  cityLabelText: PropTypes.string.isRequired,
  cityRequired: PropTypes.bool.isRequired,
  stateInputName: PropTypes.string.isRequired,
  stateLabelText: PropTypes.string.isRequired,
  stateRequired: PropTypes.bool.isRequired,
  zipInputName: PropTypes.string.isRequired,
  zipLabelText: PropTypes.string.isRequired,
  zipRequired: PropTypes.bool.isRequired,
  countryInputName: PropTypes.string.isRequired,
  countryLabelText: PropTypes.string.isRequired,
  countryRequired: PropTypes.bool.isRequired
};

Address.defaultProps = {
  streetAddressInputName: 'address-street',
  streetAddressLabelText: 'Address',
  streetAddressRequired: true,
  cityInputName: 'address-city',
  cityLabelText: 'City',
  cityRequired: true,
  stateInputName: 'address-state',
  stateLabelText: 'State',
  stateRequired: true,
  zipInputName: 'address-zip',
  zipLabelText: 'Zip / Postal code',
  zipRequired: true,
  countryInputName: 'address-country',
  countryLabelText: 'Country',
  countryRequired: true
};

export default Address;
