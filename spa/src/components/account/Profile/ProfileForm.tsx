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
import { Message, MessageSpacer } from 'components/account/Account.styled';

export const FISCALLY_SPONSORED = 'fiscally-sponsored';

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
    (companyTaxStatus === FISCALLY_SPONSORED && !fiscalSponsorName);

  const onSubmit = (formData: ProfileFormFields) => {
    onProfileSubmit(formData);
  };

  const errorMessage = Object.values(errors) ? Object.values(errors)[0]?.message : error;

  return (
    <>
      <Form onSubmit={handleSubmit(onSubmit)} data-testid="finalize-profile-form">
        <Controller
          name="firstName"
          control={control}
          render={({ field }) => <TextField id="profile-first" label="First Name" {...field} />}
        />
        <Controller
          name="lastName"
          control={control}
          render={({ field }) => <TextField id="profile-last" label="Last Name" {...field} />}
        />
        <FillRow>
          <Controller
            name="jobTitle"
            control={control}
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
              />
            )}
          />
        </FillRow>
        <FillRow>
          <Controller
            name="companyName"
            control={control}
            render={({ field }) => <TextField fullWidth id="profile-company-name" label="Organization" {...field} />}
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
                <MenuItem value="nonprofit">Nonprofit</MenuItem>
                <MenuItem value="for-profit">For-profit</MenuItem>
                <MenuItem value={FISCALLY_SPONSORED}>Fiscally sponsored</MenuItem>
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
        {companyTaxStatus === FISCALLY_SPONSORED && (
          <FillRow>
            <Controller
              name="fiscalSponsorName"
              control={control}
              rules={{
                maxLength: {
                  value: 63,
                  message: 'Fiscal Sponsor Name must have a maximum of 63 characters.'
                }
              }}
              render={({ field }) => (
                <TextField fullWidth id="profile-fiscal-sponsor-name" label="Fiscal Sponsor Name" {...field} />
              )}
            />
          </FillRow>
        )}
        <FillRow>
          <Button disabled={disabled} fullWidth size="extraLarge" type="submit">
            Finalize Account
          </Button>
        </FillRow>
      </Form>
      {errorMessage ? <Message data-testid="profile-modal-error">{errorMessage}</Message> : <MessageSpacer />}
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
  error: PropTypes.string
};

ProfileForm.propTypes = ProfileFormPropTypes;

export default ProfileForm;
