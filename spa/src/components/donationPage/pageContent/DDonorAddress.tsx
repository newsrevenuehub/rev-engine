// Needed to type return value from usePlacesWidget
/// <reference types="google.maps" />

import Grid from '@material-ui/core/Grid';
import { ChangeEvent, useState } from 'react';
import { usePlacesWidget } from 'react-google-autocomplete';
import { HUB_GOOGLE_MAPS_API_KEY } from 'appSettings';
import { CountryOption } from 'components/base';
import { usePage } from 'components/donationPage/DonationPage';
import DElement from 'components/donationPage/pageContent/DElement';
import { CountrySelect, TextField } from './DDonorAddress.styled';

const mapAddrFieldToComponentTypes = {
  address: ['street_number', 'street_address', 'route'],
  zip: ['postal_code'],
  state: ['administrative_area_level_1'],
  city: ['locality'],
  country: ['country']
};

function reduceAddressComponentsToString(addressComponents: google.maps.GeocoderAddressComponent[], targets: string[]) {
  return addressComponents
    .filter(({ types }) => targets.includes(types[0]))
    .map(({ long_name }) => long_name)
    .join(' ');
}

function mapAddressComponentsToAddressFields(addressComponents: google.maps.GeocoderAddressComponent[]) {
  const address = reduceAddressComponentsToString(addressComponents, mapAddrFieldToComponentTypes['address']);
  const zip = reduceAddressComponentsToString(addressComponents, mapAddrFieldToComponentTypes['zip']);
  const state = reduceAddressComponentsToString(addressComponents, mapAddrFieldToComponentTypes['state']);
  const city = reduceAddressComponentsToString(addressComponents, mapAddrFieldToComponentTypes['city']);
  const country = reduceAddressComponentsToString(addressComponents, mapAddrFieldToComponentTypes['country']);

  return { address, zip, city, state, country };
}

function DDonorAddress() {
  const { errors, mailingCountry, setMailingCountry } = usePage();
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');

  const { ref: addressInputRef } = usePlacesWidget<HTMLInputElement>({
    apiKey: HUB_GOOGLE_MAPS_API_KEY,
    options: { types: ['address'] },
    onPlaceSelected: ({ address_components }) => {
      // The API will not return this property in all cases; if so, do nothing.

      if (typeof address_components === 'undefined') {
        return;
      }

      const addrFields = mapAddressComponentsToAddressFields(address_components);
      const fips = address_components.find(({ types }) => types.includes('country'))?.short_name ?? '';

      setAddress(addrFields.address ?? '');
      setCity(addrFields.city ?? '');
      setState(addrFields.state ?? '');
      setZip(addrFields.zip ?? '');
      setMailingCountry(fips);
    }
  });

  // The change event on <CountrySelect> sends an object value, but the
  // underlying input will always show the label.

  function handleChangeCountry(event: ChangeEvent<{}>, value: CountryOption) {
    setMailingCountry(value.fipsCode);
  }

  return (
    <DElement>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            error={!!errors.mailing_street}
            fullWidth
            id="mailing_street"
            inputRef={addressInputRef}
            name="mailing_street"
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            helperText={errors.mailing_street}
            required
            data-testid="mailing_street"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            error={!!errors.mailing_city}
            fullWidth
            id="mailing_city"
            name="mailing_city"
            label="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            helperText={errors.mailing_city}
            required
            data-testid="mailing_city"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            error={!!errors.mailing_state}
            fullWidth
            id="mailing_state"
            name="mailing_state"
            label="State"
            value={state}
            onChange={(e) => setState(e.target.value)}
            helperText={errors.mailing_state}
            required
            data-testid="mailing_state"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            error={!!errors.mailing_postal_code}
            fullWidth
            id="mailing_postal_code"
            name="mailing_postal_code"
            label="Zip/Postal code"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            helperText={errors.mailing_postal_code}
            required
            data-testid="mailing_postal_code"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <CountrySelect
            error={!!errors.mailing_country}
            helperText={errors.mailing_country}
            id="country"
            label="Country"
            name="mailing_country"
            onChange={handleChangeCountry}
            value={mailingCountry ?? ''}
            required
          />
        </Grid>
      </Grid>
    </DElement>
  );
}

DDonorAddress.type = 'DDonorAddress';
DDonorAddress.displayName = 'Contributor Address';
DDonorAddress.description = 'Collect contributor address';
DDonorAddress.required = true;
DDonorAddress.unique = true;

export default DDonorAddress;
