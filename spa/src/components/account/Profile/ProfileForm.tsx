import { Controller, FieldValues, useForm } from 'react-hook-form';
import { Button, TextField } from 'components/base';
import * as S from './ProfileForm.styled';

/**
 * Data the user provides in the profile finalization form.
 */
export interface ProfileFormData {
  /**
   * User's company or organization name.
   */
  companyName: string;
  /**
   * User's company or organization tax status.
   */
  companyTaxStatus: 'for-profit' | 'nonprofit';
  /**
   * User's first name.
   */
  firstName: string;
  /**
   * User's job title if provided.
   */
  jobTitle?: string;
  /**
   * User's last name.
   */
  lastName: string;
}

export interface ProfileFormProps {
  disabled?: boolean;
  onProfileSubmit: (formData: ProfileFormData) => void;
}

function ProfileForm({ disabled: disabledProp, onProfileSubmit }: ProfileFormProps) {
  const { control, handleSubmit, watch } = useForm();
  const firstName = watch('firstName', '');
  const lastName = watch('lastName', '');
  const companyName = watch('companyName', '');
  const companyTaxStatus = watch('companyTaxStatus', '');
  const disabled = disabledProp || !firstName || !lastName || !companyName || !companyTaxStatus;

  const onSubmit = (formData: FieldValues) => {
    onProfileSubmit(formData as ProfileFormData);
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
          render={({ field }) => <TextField id="profile-job-title" fullWidth label="Job Title" {...field} />}
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
      <S.FillRow>
        <Controller
          name="companyTaxStatus"
          control={control}
          defaultValue=""
          render={({ field }) => (
            <TextField id="profile-company-tax-status" label="Company Tax Status" {...field} fullWidth select>
              <option disabled={companyTaxStatus !== ''} value="">
                Select your status
              </option>
              <option value="nonprofit">Non-profit</option>
              <option value="for-profit">For-profit</option>
            </TextField>
          )}
        />
      </S.FillRow>
      <S.FillRow>
        <Button disabled={disabled} fullWidth type="submit">
          Finalize Account
        </Button>
      </S.FillRow>
    </S.Form>
  );
}

export default ProfileForm;
