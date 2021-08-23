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

  return (
    <DElement {...props} data-testid="d-donor-info">
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Input
            type="text"
            name="first_name"
            label="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            errors={errors.first_name}
            required
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Input
            type="text"
            name="last_name"
            label="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            errors={errors.last_name}
            required
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
            required
          />
        </Grid>
      </Grid>
    </DElement>
  );
}

DDonorInfo.type = 'DDonorInfo';
DDonorInfo.displayName = 'Donor info';
DDonorInfo.description = 'Collect donor name and email';
DDonorInfo.required = true;
DDonorInfo.unique = true;

export default DDonorInfo;
