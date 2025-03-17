import PropTypes, { InferProps } from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePage } from 'components/donationPage/DonationPage';
import { DonorInfoElement } from 'hooks/useContributionPage';
import DElement from '../DElement';
import EmailTextField from './EmailTextField';
import { Root, TextField } from './DDonorInfo.styled';

const DDonorInfoPropTypes = {
  element: PropTypes.object.isRequired
};

export interface DDonorInfoProps extends InferProps<typeof DDonorInfoPropTypes> {
  element: DonorInfoElement;
}

export function DDonorInfo(props: DDonorInfoProps) {
  const { errors } = usePage();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const { t } = useTranslation();

  return (
    <DElement {...props} data-testid="d-donor-info">
      <Root>
        <TextField
          error={!!errors.first_name}
          helperText={errors.first_name}
          id="donor-info-first-name"
          label={t('donationPage.dDonorInfo.firstName')}
          name="first_name"
          onChange={({ target }) => setFirstName(target.value)}
          required
          value={firstName}
          data-testid="first_name"
        />
        <TextField
          error={!!errors.last_name}
          helperText={errors.last_name}
          id="donor-info-last-name"
          label={t('donationPage.dDonorInfo.lastName')}
          name="last_name"
          onChange={({ target }) => setLastName(target.value)}
          required
          value={lastName}
          data-testid="last_name"
        />
        <EmailTextField
          error={!!errors.email}
          helperText={errors.email}
          id="donor-info-email"
          label={t('donationPage.dDonorInfo.email')}
          name="email"
          onAcceptSuggestedValue={setEmail}
          onChange={({ target }) => setEmail(target.value)}
          required
          value={email}
          data-testid="email"
        />
        {props.element.content.askPhone && (
          <TextField
            error={!!errors.phone}
            helperText={errors.phone}
            id="donor-info-phone"
            label={t('donationPage.dDonorInfo.phone')}
            inputProps={{ className: 'NreTextFieldInput', maxlength: 20 }}
            name="phone"
            onChange={({ target }) => setPhone(target.value)}
            required={props.element.requiredFields?.includes('phone')}
            type="tel"
            value={phone}
            data-testid="phone"
          />
        )}
      </Root>
    </DElement>
  );
}

DDonorInfo.propTypes = DDonorInfoPropTypes;

DDonorInfo.type = 'DDonorInfo';
DDonorInfo.displayName = 'Contributor Info';
DDonorInfo.description = 'Collect contributor name and email';
DDonorInfo.required = true;
DDonorInfo.unique = true;

export default DDonorInfo;
