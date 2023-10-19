import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Grid from '@material-ui/core/Grid';

// Context
import { usePage } from 'components/donationPage/DonationPage';

// Children
import DElement from 'components/donationPage/pageContent/DElement';
import Input from 'elements/inputs/Input';

function DDonorInfo({ element, ...props }) {
  const { t } = useTranslation();
  const { errors } = usePage();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <DElement {...props} data-testid="d-donor-info">
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Input
            type="text"
            name="first_name"
            label={t('donationPage.dDonorInfo.firstName')}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            errors={errors.first_name}
            required
            testid="first_name"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Input
            type="text"
            name="last_name"
            label={t('donationPage.dDonorInfo.lastName')}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            errors={errors.last_name}
            testid="last_name"
            required
          />
        </Grid>
        <Grid item xs={12} md={element.content?.askPhone ? 6 : 12}>
          <Input
            type="email"
            name="email"
            label={t('donationPage.dDonorInfo.email')}
            value={email}
            testid="email"
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
              label={t('donationPage.dDonorInfo.phone')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={40}
              errors={errors.phone}
              required={element.requiredFields?.includes('phone')}
              testid="phone"
            />
          </Grid>
        )}
      </Grid>
    </DElement>
  );
}

DDonorInfo.type = 'DDonorInfo';
DDonorInfo.displayName = 'Contributor Info';
DDonorInfo.description = 'Collect contributor name and email';
DDonorInfo.required = true;
DDonorInfo.unique = true;

export default DDonorInfo;
