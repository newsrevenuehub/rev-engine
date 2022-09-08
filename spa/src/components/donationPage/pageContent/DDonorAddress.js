import { useState, forwardRef } from 'react';
import countryCodes from 'country-code-lookup';

import * as S from './DDonorAddress.styled';
// Context
import { usePage } from 'components/donationPage/DonationPage';

// Constants
import { HUB_GOOGLE_MAPS_API_KEY } from 'settings';

// Deps
import { usePlacesWidget } from 'react-google-autocomplete';
import Grid from '@material-ui/core/Grid';

// Children
import DElement from 'components/donationPage/pageContent/DElement';
import Input from 'elements/inputs/Input';
import Select from 'elements/inputs/Select';

function DDonorAddress() {
  const { errors } = usePage();
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState(null);

  const { setMailingCountry } = usePage();

  const { ref } = usePlacesWidget({
    apiKey: HUB_GOOGLE_MAPS_API_KEY,
    options: {
      types: ['address']
    },
    onPlaceSelected: (place) => {
      const fips = place.address_components.find(({ types }) => types.includes('country')).short_name;
      const chosenCountry = countryCodes.byFips(fips);
      const addrFields = mapAddressComponentsToAddressFields(place.address_components);
      setAddress(addrFields.address || '');
      setCity(addrFields.city || '');
      setState(addrFields.state || '');
      setZip(addrFields.zip || '');
      setCountry({ value: chosenCountry.value, label: chosenCountry.country });
      setMailingCountry(fips);
    }
  });

  // Ok-- let's just get this logic on develop so we can easily switch this feature on
  // when the time comes. shouldUseAutocomplete should be false when the page editor has
  // chosen to only show zip and/or country fields. Right now they cannot change the fields
  // shown in this element, so it's a moot point.
  const shouldUseAutocomplete = true;

  return (
    <DElement>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <ConditionalAddressAutocomplete
            useAutocomplete={shouldUseAutocomplete}
            ref={ref}
            address={address}
            setAddress={setAddress}
            errors={errors.mailing_street}
          />
        </Grid>
        <Grid item xs={12}>
          <Input
            type="text"
            name="mailing_city"
            label="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            errors={errors.mailing_city}
            required
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <Input
            type="text"
            name="mailing_state"
            label="State"
            value={state}
            onChange={(e) => setState(e.target.value)}
            errors={errors.mailing_state}
            required
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <Input
            type="text"
            name="mailing_postal_code"
            label="Zip/Postal code"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            errors={errors.mailing_postal_code}
            required
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <Select
            label="Country"
            onSelectedItemChange={({ selectedItem }) => {
              setCountry(selectedItem);
              setMailingCountry(selectedItem.value);
            }}
            selectedItem={country || ''}
            items={countryCodes.countries
              .map(({ country: label, fips: value }) => ({ label, value }))
              .sort(({ value }) => value)}
            name="mailing_country"
            displayAccessor={'label'}
            required
            errors={errors.mailing_country}
          />
        </Grid>
      </Grid>
    </DElement>
  );
}

DDonorAddress.type = 'DDonorAddress';
DDonorAddress.displayName = 'Donor address';
DDonorAddress.description = 'Collect donor address';
DDonorAddress.required = true;
DDonorAddress.unique = true;

export default DDonorAddress;

const ConditionalAddressAutocomplete = forwardRef(({ useAutocomplete, address, setAddress, errors }, ref) => {
  return (
    <>
      <S.ConditionallyHiddenInput
        show={!useAutocomplete}
        type="text"
        name="mailing_street"
        label="Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        errors={errors}
        required
      />
      <S.ConditionallyHiddenInput
        show={useAutocomplete}
        type="text"
        ref={ref}
        name="mailing_street"
        label="Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        errors={errors}
        required
      />
    </>
  );
});

const mapAddrFieldToComponentTypes = {
  address: ['street_number', 'street_address', 'route'],
  zip: ['postal_code'],
  state: ['administrative_area_level_1'],
  city: ['locality'],
  country: ['country']
};

function reduceAddressComponentsToString(addressComponents, targets) {
  const componentTypes = addressComponents.filter((addrComp) => targets.includes(addrComp.types[0]));
  return componentTypes.map((cmp) => cmp.long_name).join(' ');
}

function mapAddressComponentsToAddressFields(addressComponents) {
  if (!addressComponents) return {};
  const address = reduceAddressComponentsToString(addressComponents, mapAddrFieldToComponentTypes['address']);
  const zip = reduceAddressComponentsToString(addressComponents, mapAddrFieldToComponentTypes['zip']);
  const state = reduceAddressComponentsToString(addressComponents, mapAddrFieldToComponentTypes['state']);
  const city = reduceAddressComponentsToString(addressComponents, mapAddrFieldToComponentTypes['city']);
  const country = reduceAddressComponentsToString(addressComponents, mapAddrFieldToComponentTypes['country']);
  return { address, zip, city, state, country };
}
