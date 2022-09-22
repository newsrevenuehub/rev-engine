import { useForm } from 'react-hook-form';
import PropTypes from 'prop-types';

import * as F from './ProfileForm.styled';
import * as S from 'components/account/Account.styled';
import * as P from './Profile.styled';
import { KeyboardArrowDown } from '@material-ui/icons';

function ProfileForm({ disabled: disabledProp, onProfileSubmit }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm();

  const firstName = watch('firstName', '');
  const lastName = watch('lastName', '');
  const companyName = watch('companyName', '');
  const companyTaxStatus = watch('companyTaxStatus', '');
  const disabled = disabledProp || !firstName || !lastName || !companyName || !companyTaxStatus;

  const onSubmit = (formData) => {
    onProfileSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} data-testid="finalize-profile-form">
      <P.Row>
        <P.Column>
          <S.InputLabel hasError={errors.firstName} htmlFor="firstName">
            First Name
          </S.InputLabel>
          <S.InputOuter hasError={errors.firstName}>
            <input
              id="firstName"
              name="firstName"
              {...register('firstName')}
              type="text"
              status={errors.firstName}
              data-testid="first-name"
            />
          </S.InputOuter>
          {errors.firstName ? <S.Message role="error">{errors.firstName.message}</S.Message> : <S.MessageSpacer />}
        </P.Column>
        <P.Column>
          <S.InputLabel hasError={errors.lastName} htmlFor="lastName">
            Last Name
          </S.InputLabel>
          <S.InputOuter hasError={errors.lastName}>
            <input
              id="lastName"
              name="lastName"
              {...register('lastName')}
              type="text"
              status={errors.lastName}
              data-testid="last-name"
            />
          </S.InputOuter>
          {errors.lastName ? <S.Message role="error">{errors.lastName.message}</S.Message> : <S.MessageSpacer />}
        </P.Column>
      </P.Row>

      <S.InputLabel hasError={errors.jobTitle} htmlFor="jobTitle">
        Job Title <F.OptionalLabel>Optional</F.OptionalLabel>
      </S.InputLabel>
      <S.InputOuter hasError={errors.jobTitle}>
        <input
          id="jobTitle"
          name="jobTitle"
          {...register('jobTitle')}
          type="text"
          status={errors.jobTitle}
          data-testid="job-title"
        />
      </S.InputOuter>
      {errors.jobTitle ? <S.Message role="error">{errors.jobTitle.message}</S.Message> : <S.MessageSpacer />}
      <S.InputLabel hasError={errors.companyName} htmlFor="companyName">
        Company Name
      </S.InputLabel>
      <S.InputOuter hasError={errors.companyName}>
        <input
          id="companyName"
          name="companyName"
          {...register('companyName')}
          type="text"
          status={errors.companyName}
          data-testid="company-name"
        />
      </S.InputOuter>
      {errors.companyName ? <S.Message role="error">{errors.companyName.message}</S.Message> : <S.MessageSpacer />}

      <S.InputLabel hasError={errors.companyTaxStatus} htmlFor="companyTaxStatus">
        Company Tax Status
      </S.InputLabel>
      <S.InputOuter hasError={errors.companyTaxStatus}>
        <P.Select
          id="companyTaxStatus"
          name="companyTaxStatus"
          {...register('companyTaxStatus')}
          status={errors.companyTaxStatus}
          data-testid="tax-status"
        >
          <option disabled={companyTaxStatus !== ''} value="">
            Please select
          </option>
          <option value="nonprofit">Non-profit</option>
          <option value="for-profit">For-profit</option>
        </P.Select>
        <P.SelectIcon aria-hidden>
          <KeyboardArrowDown />
        </P.SelectIcon>
      </S.InputOuter>
      {errors.companyTaxStatus ? (
        <S.Message role="error">{errors.companyTaxStatus.message}</S.Message>
      ) : (
        <S.MessageSpacer />
      )}
      <S.Submit type="submit" disabled={disabled} name="Finalize Account">
        Finalize Account
      </S.Submit>
    </form>
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
