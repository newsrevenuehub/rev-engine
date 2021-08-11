import { useState } from 'react';

// Context
import { usePage } from 'components/donationPage/DonationPage';

// Deps
import Grid from '@material-ui/core/Grid';

// Children
import DElement from 'components/donationPage/pageContent/DElement';
import Input from 'elements/inputs/Input';

function DDonorAddress() {
  const { errors } = usePage();
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('');

  return (
    <DElement>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Input
            type="text"
            name="mailing_street"
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            errors={errors.mailing_street}
            required
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
        <Grid item xs={12} sm={4}>
          <Input
            type="text"
            name="mailing_country"
            label="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            errors={errors.mailing_country}
            required
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
