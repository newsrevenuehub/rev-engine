import { useState } from 'react';

import Grid from '@material-ui/core/Grid';

// Children
import Input from 'elements/inputs/Input';

const errors = [];

function ContributorInfo({ element, ...props }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <div data-testid="d-donor-info">
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
        <Grid item xs={12} md={element.content?.askPhone ? 6 : 12}>
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
        {element.content?.askPhone && (
          <Grid item xs={12} md={6}>
            <Input
              type="tel"
              name="phone"
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={40}
              errors={errors.phone}
              required={element.requiredFields?.includes('phone')}
            />
          </Grid>
        )}
      </Grid>
    </div>
  );
}

ContributorInfo.type = 'DDonorInfo';
ContributorInfo.displayName = 'Donor info';
ContributorInfo.description = 'Collect donor name and email';
ContributorInfo.required = true;
ContributorInfo.unique = true;

export default ContributorInfo;

export const validator = {};
