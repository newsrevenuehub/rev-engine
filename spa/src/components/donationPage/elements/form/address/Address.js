import { usePlacesWidget } from 'react-google-autocomplete';

import { HUB_GOOGLE_MAPS_API_KEY } from 'settings';
import LabeledInput from 'elements/inputs/LabeledInput';
import clsx from 'clsx';

export const defaultArgs = {
  streetAdressInputName: 'address-street',
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

function Address({
  streetAdressInputName = defaultArgs.streetAdressInputName,
  streetAddressLabelText = defaultArgs.streetAddressLabelText,
  streetAddressRequired = defaultArgs.streetAddressRequired,
  cityInputName = defaultArgs.cityInputName,
  cityLabelText = defaultArgs.cityLabelText,
  cityRequired = defaultArgs.cityRequired,
  stateInputName = defaultArgs.stateInputName,
  stateLabelText = defaultArgs.stateLabelText,
  stateRequired = defaultArgs.stateRequired,
  zipInputName = defaultArgs.zipInputName,
  zipLabelText = defaultArgs.zipLabelText,
  zipRequired = defaultArgs.zipRequired,
  countryInputName = defaultArgs.countryInputName,
  countryLabelText = defaultArgs.countryLabelText,
  countryRequired = defaultArgs.countryRequired
}) {
  // const { ref } = usePlacesWidget({
  //   apiKey: HUB_GOOGLE_MAPS_API_KEY,
  //   options: {
  //     types: ['address']
  //   },
  //   onPlaceSelected: (place) => {
  //     const addrFields = mapAddressComponentsToAddressFields(place.address_components);
  //     // do something
  //     // setAddress(addrFields.address || '');
  //     // setCity(addrFields.city || '');
  //     // setState(addrFields.state || '');
  //     // setZip(addrFields.zip || '');
  //     // setCountry(addrFields.country || '');
  //   }
  // });
  const topInputsCommonClasses = 'w-full';
  return (
    <fieldset className={clsx('w-full flex flex-col items-center')}>
      <LabeledInput
        className={clsx(topInputsCommonClasses)}
        name={streetAdressInputName}
        labelText={streetAddressLabelText}
        required={streetAddressRequired}
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

      {/* <in
        useAutocomplete={shouldUseAutocomplete}
        ref={ref}
        address={address}
        setAddress={setAddress}
        errors={errors.mailing_street}
      />
      <Input
        type="text"
        name="mailing_city"
        label="City"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        errors={errors.mailing_city}
        required
      />
      <Input
        type="text"
        name="mailing_state"
        label="State"
        value={state}
        onChange={(e) => setState(e.target.value)}
        errors={errors.mailing_state}
        required
      />
      <Input
        type="text"
        name="mailing_postal_code"
        label="Zip/Postal code"
        value={zip}
        onChange={(e) => setZip(e.target.value)}
        errors={errors.mailing_postal_code}
        required
      />
      <Input
        type="text"
        name="mailing_country"
        label="Country"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        errors={errors.mailing_country}
        required
      /> */}
    </fieldset>
  );
}

// Address.type = 'Address';
// Address.displayName = 'Donor address';
// Address.description = 'Collect donor address';
// Address.required = true;
// Address.unique = true;

export default Address;
