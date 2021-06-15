import { useState } from 'react';

import { Grid } from 'semantic-ui-react';

// Children
import DElement from 'components/donationPage/pageContent/DElement';
import Input from 'elements/inputs/Input';

function DDonorInfo(props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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
              <Input type="text" label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </Grid.Column>
            <Grid.Column tablet={16} computer={8}>
              <Input type="text" label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </DElement>
      <DElement>
        <Grid>
          <Grid.Row>
            <Grid.Column width={16}>
              <Input type="text" label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </Grid.Column>
          </Grid.Row>

          <Grid.Row>
            <Grid.Column mobile={16} tablet={8} computer={7}>
              <Input type="text" label="City" value={city} onChange={(e) => setCity(e.target.value)} />
            </Grid.Column>
            <Grid.Column mobile={16} tablet={8} computer={3}>
              <Input type="text" label="State" value={state} onChange={(e) => setState(e.target.value)} />
            </Grid.Column>
            <Grid.Column mobile={16} tablet={8} computer={3}>
              <Input type="number" label="Zip" value={zip} onChange={(e) => setZip(e.target.value)} />
            </Grid.Column>
            <Grid.Column mobile={16} tablet={8} computer={3}>
              <Input type="text" label="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </DElement>
    </>
  );
}

export default DDonorInfo;
