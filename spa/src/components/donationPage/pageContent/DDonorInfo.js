import { useState } from 'react';

import { Grid } from 'semantic-ui-react';

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
        <Grid>
          <Grid.Row>
            <Grid.Column tablet={16} computer={8}>
              <Input
                type="text"
                name="first_name"
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                errors={errors.firstName}
              />
            </Grid.Column>
            <Grid.Column tablet={16} computer={8}>
              <Input
                type="text"
                name="last_name"
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                errors={errors.lastName}
              />
            </Grid.Column>
          </Grid.Row>
          <Grid.Row>
            <Grid.Column>
              <Input
                type="email"
                name="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                errors={errors.email}
              />
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </DElement>
      <DElement>
        <Grid>
          <Grid.Row>
            <Grid.Column width={16}>
              <Input
                type="text"
                name="mailing_street"
                label="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                errors={errors.address}
              />
            </Grid.Column>
          </Grid.Row>

          <Grid.Row>
            <Grid.Column mobile={16} tablet={8} computer={12}>
              <Input
                type="text"
                name="mailing_city"
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                errors={errors.city}
              />
            </Grid.Column>
            <Grid.Column mobile={16} tablet={8} computer={4}>
              <Input
                type="text"
                name="mailing_state"
                label="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
                errors={errors.state}
              />
            </Grid.Column>
          </Grid.Row>
          <Grid.Row>
            <Grid.Column mobile={16} tablet={8} computer={6}>
              <Input
                type="text"
                name="mailing_postal_code"
                label="Zip"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                errors={errors.zip}
              />
            </Grid.Column>
            <Grid.Column mobile={16} tablet={8} computer={10}>
              <Input
                type="text"
                name="mailing_country"
                label="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                errors={errors.country}
              />
            </Grid.Column>
          </Grid.Row>
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
