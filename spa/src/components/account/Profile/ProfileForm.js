import { Button, TextField } from 'components/base';
import PropTypes from 'prop-types';
import { Controller, useForm } from 'react-hook-form';
import * as S from './ProfileForm.styled';

function ProfileForm({ disabled: disabledProp, onProfileSubmit }) {
  const { control, handleSubmit, watch } = useForm();
  const firstName = watch('firstName', '');
  const lastName = watch('lastName', '');
  const companyName = watch('companyName', '');
  const companyTaxStatus = watch('companyTaxStatus', '');
  const disabled = disabledProp || !firstName || !lastName || !companyName || !companyTaxStatus;

  const onSubmit = (formData) => {
    onProfileSubmit(formData);
  };
  return (
    <S.Form onSubmit={handleSubmit(onSubmit)} data-testid="finalize-profile-form">
      <Controller
        name="firstName"
        control={control}
        defaultValue=""
        render={({ field }) => <TextField id="profile-first" label="First Name" {...field} />}
      />
      <Controller
        name="lastName"
        control={control}
        defaultValue=""
        render={({ field }) => <TextField id="profile-last" label="Last Name" {...field} />}
      />
      <S.FillRow>
        <Controller
          name="jobTitle"
          control={control}
          defaultValue=""
          render={({ field }) => (
            <TextField
              id="profile-job-title"
              fullWidth
              label={
                <>
                  Job Title <S.FieldLabelOptional>Optional</S.FieldLabelOptional>
                </>
              }
              {...field}
            />
          )}
        />
      </S.FillRow>
      <S.FillRow>
        <Controller
          name="companyName"
          control={control}
          defaultValue=""
          render={({ field }) => <TextField fullWidth id="profile-company-name" label="Company Name" {...field} />}
        />
      </S.FillRow>
      <S.TaxStatusContainer>
        <Controller
          name="companyTaxStatus"
          control={control}
          defaultValue=""
          render={({ field }) => (
            <TextField fullWidth id="profile-company-tax-status" label="Company Tax Status" {...field} select>
              <option disabled={companyTaxStatus !== ''} value="">
                Select your status
              </option>
              <option value="nonprofit">Non-profit</option>
              <option value="for-profit">For-profit</option>
            </TextField>
          )}
        />
        <S.TaxStatusInfoTooltip title="Your tax status determines the contribution fees charged through Stripe." />
      </S.TaxStatusContainer>
      <S.FillRow>
        <Button disabled={disabled} fullWidth type="submit">
          Finalize Account
        </Button>
      </S.FillRow>
    </S.Form>
  );
}

ProfileForm.propTypes = {
  /**
   * Callback when the form is submitted by the user. Form data will be passed
   * as the first argument.
   */
  onProfileSubmit: PropTypes.func.isRequired,
  /**
   * Should the form be disabled?
   */
  disabled: PropTypes.bool
};

export default ProfileForm;
