import { useForm } from 'react-hook-form';
import PropTypes from 'prop-types';

import * as S from '../Account.styled';

function ForgotPasswordForm({ onForgotPasswordSubmit, loading }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm();

  const onSubmit = async (fdata) => {
    onForgotPasswordSubmit(fdata);
  };

  const watchEmail = watch('email', '');
  const disabled = loading || !watchEmail;

  /* eslint-disable jsx-a11y/aria-role */

  return (
    <form onSubmit={disabled ? () => {} : handleSubmit(onSubmit)}>
      <S.InputLabel hasError={errors.email}>Email</S.InputLabel>
      <S.InputOuter hasError={errors.email}>
        <input
          id="email"
          {...register('email', {
            pattern: {
              value: /\S+@\S+\.\S+/,
              message: 'Please enter a valid email address'
            }
          })}
          type="text"
          status={errors.email}
          data-testid="forgotpwd-email"
        />
      </S.InputOuter>
      {errors.email ? <S.Message role="error">{errors.email.message}</S.Message> : <S.MessageSpacer />}

      <S.Submit type="submit" disabled={disabled} name="Send Reset Link" size="extraLarge">
        Send Reset Link
      </S.Submit>
    </form>
  );
  /* eslint-enable jsx-a11y/aria-role */
}

ForgotPasswordForm.propTypes = {
  onForgotPasswordSubmit: PropTypes.func,
  loading: PropTypes.bool
};

export default ForgotPasswordForm;
