import { useState } from 'react';

import Grid from '@material-ui/core/Grid';

// Context
import { usePage } from 'components/donationPage/DonationPage';

// Children
import DElement from 'components/donationPage/pageContent/DElement';
import Input from 'elements/inputs/Input';

function DDonorInfo(props) {
  const { errors } = usePage();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('');

  return (
    <>
      <DElement label="Name" {...props} data-testid="d-donor-info">
        <Grid container spacing={3}>
          <Grid item md={12} lg={6}>
            <Input
              type="text"
              name="first_name"
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              errors={errors.first_name}
            />
          </Grid>
          <Grid item md={12} lg={6}>
            <Input
              type="text"
              name="last_name"
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              errors={errors.last_name}
            />
          </Grid>
          <Grid item xs={12}>
            <Input
              type="email"
              name="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              errors={errors.email}
            />
          </Grid>
        </Grid>
      </DElement>
      <DElement>
        <Grid>
          <Grid item xs={12}>
            <Input
              type="text"
              name="mailing_street"
              label="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              errors={errors.mailing_street}
            />
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <Input
              type="text"
              name="mailing_city"
              label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              errors={errors.mailing_city}
            />
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            <Input
              type="text"
              name="mailing_state"
              label="State"
              value={state}
              onChange={(e) => setState(e.target.value)}
              errors={errors.mailing_state}
            />
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            <Input
              type="text"
              name="mailing_postal_code"
              label="Zip"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              errors={errors.mailing_postal_code}
            />
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <Input
              type="text"
              name="mailing_country"
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              errors={errors.mailing_country}
            />
          </Grid>
        </Grid>
      </DElement>
    </>
  );
}

DDonorInfo.type = 'DDonorInfo';
DDonorInfo.displayName = 'Donor info';
DDonorInfo.description = 'Donors can self report information here';
DDonorInfo.required = true;
DDonorInfo.unique = true;

export default DDonorInfo;
