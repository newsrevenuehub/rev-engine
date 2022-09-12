import { useForm } from 'react-hook-form';
import PropTypes from 'prop-types';

import * as S from 'components/account/Account.styled';
import * as P from './Profile.styled';

function ProfileForm({ onProfileSubmit, loading }) {
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
  const jobTitle = watch('jobTitle', '');

  const disabled = !firstName || !jobTitle || !lastName || !companyName || !companyTaxStatus || loading;

  const onSubmit = async (fdata) => {
    onProfileSubmit(fdata);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <P.Row>
        <P.Column>
          <S.InputLabel hasError={errors.firstName}>First Name</S.InputLabel>
          <S.InputOuter hasError={errors.firstName}>
            <input id="firstName" name="firstName" {...register('firstName')} type="text" status={errors.firstName} />
          </S.InputOuter>
          {errors.firstName ? <S.Message role="error">{errors.firstName.message}</S.Message> : <S.MessageSpacer />}
        </P.Column>
        <P.Column>
          <S.InputLabel hasError={errors.lastName}>Last Name</S.InputLabel>
          <S.InputOuter hasError={errors.lastName}>
            <input id="lastName" name="lastName" {...register('lastName')} type="text" status={errors.lastName} />
          </S.InputOuter>
          {errors.lastName ? <S.Message role="error">{errors.lastName.message}</S.Message> : <S.MessageSpacer />}
        </P.Column>
      </P.Row>

      <S.InputLabel hasError={errors.jobTitle}>Job Title</S.InputLabel>
      <S.InputOuter hasError={errors.jobTitle}>
        <input id="jobTitle" name="jobTitle" {...register('jobTitle')} type="text" status={errors.jobTitle} />
      </S.InputOuter>
      {errors.jobTitle ? <S.Message role="error">{errors.jobTitle.message}</S.Message> : <S.MessageSpacer />}

      <S.InputLabel hasError={errors.companyName}>Company Name</S.InputLabel>
      <S.InputOuter hasError={errors.companyName}>
        <input
          id="companyName"
          name="companyName"
          {...register('companyName')}
          type="text"
          status={errors.companyName}
        />
      </S.InputOuter>
      {errors.companyName ? <S.Message role="error">{errors.companyName.message}</S.Message> : <S.MessageSpacer />}

      <S.InputLabel hasError={errors.companyTaxStatus}>Company Tax Status</S.InputLabel>
      <S.InputOuter hasError={errors.companyTaxStatus}>
        <select
          id="companyTaxStatus"
          name="companyTaxStatus"
          {...register('companyTaxStatus')}
          type="text"
          status={errors.companyTaxStatus}
        >
          <option value="for-profit">For Profit</option>
          <option value="nonprofit">Non Profit</option>
        </select>
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
  onProfileSubmit: PropTypes.func,
  loading: PropTypes.bool
};

export default ProfileForm;
