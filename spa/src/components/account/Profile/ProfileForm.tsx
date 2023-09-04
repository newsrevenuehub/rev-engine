import { Button, TextField, MenuItem } from 'components/base';
import PropTypes, { InferProps } from 'prop-types';
import { Controller, useForm } from 'react-hook-form';
import MaskedInput from 'react-input-mask';

import {
  FieldLabelOptional,
  FillRow,
  Form,
  TooltipContainer,
  InfoTooltip,
  StyledTextField
} from './ProfileForm.styled';
import { Message } from 'components/account/Account.styled';
import { TAX_STATUS } from 'constants/fiscalStatus';

export const defaultValues = {
  companyName: '',
  // companyTaxStatus needs to be "." so that it shows the default label "Select your status".
  // Using empty string didn't work
  companyTaxStatus: '.',
  firstName: '',
  jobTitle: '',
  lastName: '',
  taxId: '',
  fiscalSponsorName: ''
};

export type ProfileFormFields = typeof defaultValues;
export interface ProfileFormProps extends InferProps<typeof ProfileFormPropTypes> {
  onProfileSubmit: (form: ProfileFormFields) => void;
}

function ProfileForm({ disabled: disabledProp, onProfileSubmit, error }: ProfileFormProps) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({ defaultValues });
  const firstName = watch('firstName');
  const lastName = watch('lastName');
  const companyName = watch('companyName');
  const companyTaxStatus = watch('companyTaxStatus');
  const fiscalSponsorName = watch('fiscalSponsorName');
  const disabled =
    disabledProp ||
    !firstName ||
    !lastName ||
    !companyName ||
    companyTaxStatus === '.' ||
    (companyTaxStatus === TAX_STATUS.FISCALLY_SPONSORED && !fiscalSponsorName);

  const onSubmit = (formData: ProfileFormFields) => {
    onProfileSubmit(formData);
  };

  return (
    <>
      <Form onSubmit={handleSubmit(onSubmit)} data-testid="finalize-profile-form">
        <Controller
          name="firstName"
          control={control}
          rules={{
            required: 'First Name is required',
            maxLength: { value: 50, message: 'First Name must have a maximum of 50 characters.' }
          }}
          render={({ field }) => (
            <TextField
              id="profile-first"
              label="First Name"
              {...field}
              helperText={errors?.firstName?.message || error?.first_name?.[0]}
              error={!!errors?.firstName || !!error?.first_name}
            />
          )}
        />
        <Controller
          name="lastName"
          control={control}
          rules={{
            required: 'Last Name is required',
            maxLength: { value: 50, message: 'Last Name must have a maximum of 50 characters.' }
          }}
          render={({ field }) => (
            <TextField
              id="profile-last"
              label="Last Name"
              {...field}
              helperText={errors?.lastName?.message || error?.last_name?.[0]}
              error={!!errors?.lastName || !!error?.last_name}
            />
          )}
        />
        <FillRow>
          <Controller
            name="jobTitle"
            control={control}
            rules={{
              maxLength: { value: 50, message: 'Job Title must have a maximum of 50 characters.' }
            }}
            render={({ field }) => (
              <TextField
                id="profile-job-title"
                fullWidth
                label={
                  <>
                    Job Title <FieldLabelOptional>Optional</FieldLabelOptional>
                  </>
                }
                {...field}
                helperText={errors?.jobTitle?.message || error?.job_title?.[0]}
                error={!!errors?.jobTitle || !!error?.job_title}
              />
            )}
          />
        </FillRow>
        <FillRow>
          <Controller
            name="companyName"
            control={control}
            rules={{
              required: 'Organization is required',
              maxLength: { value: 253, message: 'Organization must have a maximum of 253 characters.' }
            }}
            render={({ field }) => (
              <TextField
                fullWidth
                id="profile-company-name"
                label="Organization"
                {...field}
                helperText={errors?.companyName?.message || error?.organization_name?.[0]}
                error={!!errors?.companyName || !!error?.organization_name}
              />
            )}
          />
        </FillRow>
        <TooltipContainer>
          <Controller
            name="companyTaxStatus"
            control={control}
            render={({ field }) => (
              <TextField fullWidth id="profile-company-tax-status" label="Company Tax Status" {...field} select>
                {/* Shows "Select your status" label when companyTaxStatus = . (initialState)*/}
                <MenuItem disabled value="." style={{ display: 'none' }}>
                  Select your status
                </MenuItem>
                <MenuItem value={TAX_STATUS.NONPROFIT}>Nonprofit</MenuItem>
                <MenuItem value={TAX_STATUS.FOR_PROFIT}>For-profit</MenuItem>
                <MenuItem value={TAX_STATUS.FISCALLY_SPONSORED}>Fiscally sponsored</MenuItem>
              </TextField>
            )}
          />
          <InfoTooltip
            buttonLabel="Help for Company Tax Status"
            title="Your tax status determines the contribution fees charged through Stripe."
          />
        </TooltipContainer>
        <TooltipContainer>
          <Controller
            name="taxId"
            control={control}
            rules={{ pattern: { value: /[0-9]{2}-[0-9]{7}/, message: 'EIN must have 9 digits' } }}
            render={({ field }) => (
              <MaskedInput mask="99-9999999" {...field}>
                {(inputProps: any) => (
                  <StyledTextField
                    fullWidth
                    id="profile-tax-id"
                    data-testid="profile-tax-id"
                    placeholder="XX-XXXXXXX"
                    label={
                      <>
                        EIN <FieldLabelOptional>Optional</FieldLabelOptional>
                      </>
                    }
                    {...inputProps}
                  />
                )}
              </MaskedInput>
            )}
          />
          <InfoTooltip
            buttonLabel="Help for EIN"
            title="If your organization is fiscally sponsored, enter the fiscal sponsor’s EIN."
          />
        </TooltipContainer>
        {companyTaxStatus === TAX_STATUS.FISCALLY_SPONSORED && (
          <FillRow>
            <Controller
              name="fiscalSponsorName"
              control={control}
              rules={{
                maxLength: {
                  value: 100,
                  message: 'Fiscal Sponsor Name must have a maximum of 100 characters.'
                }
              }}
              render={({ field }) => (
                <TextField
                  fullWidth
                  id="profile-fiscal-sponsor-name"
                  label="Fiscal Sponsor Name"
                  {...field}
                  helperText={errors?.fiscalSponsorName?.message || error?.fiscal_sponsor_name?.[0]}
                  error={!!errors?.fiscalSponsorName || !!error?.fiscal_sponsor_name}
                />
              )}
            />
          </FillRow>
        )}
        <FillRow>
          <Button disabled={disabled} fullWidth size="extraLarge" type="submit">
            Finalize Account
          </Button>
          {error?.detail && <Message data-testid="profile-modal-error">{error?.detail}</Message>}
        </FillRow>
      </Form>
    </>
  );
}

const ProfileFormPropTypes = {
  /**
   * Callback when the form is submitted by the user. Form data will be passed
   * as the first argument.
   */
  onProfileSubmit: PropTypes.func.isRequired,
  /**
   * Should the form be disabled?
   */
  disabled: PropTypes.bool,
  error: PropTypes.shape({
    first_name: PropTypes.arrayOf(PropTypes.string),
    last_name: PropTypes.arrayOf(PropTypes.string),
    job_title: PropTypes.arrayOf(PropTypes.string),
    organization_name: PropTypes.arrayOf(PropTypes.string),
    fiscal_sponsor_name: PropTypes.arrayOf(PropTypes.string),
    detail: PropTypes.string
  })
};

ProfileForm.propTypes = ProfileFormPropTypes;

export default ProfileForm;
