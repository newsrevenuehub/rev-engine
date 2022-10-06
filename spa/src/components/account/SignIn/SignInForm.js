import * as S from '../Account.styled';
import { useForm } from 'react-hook-form';
import useModal from 'hooks/useModal';
import PropTypes from 'prop-types';

import visibilityOn from 'assets/images/account/visibility_on.png';
import visibilityOff from 'assets/images/account/visibility_off.png';

import { FORGOT_PASSWORD } from 'routes';
import { Tooltip } from 'components/base';

function SignInForm({ onSubmitSignIn, loading }) {
  const { open: showPassword, handleToggle: togglePasswordVisiblity } = useModal();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm();

  const watchEmail = watch('email', '');
  const watchPassword = watch('password', '');

  const disabled = !watchEmail || !watchPassword || loading;

  const onSubmit = async (fdata) => {
    onSubmitSignIn(fdata);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <S.InputLabel hasError={errors.email}>Email</S.InputLabel>
      <S.InputOuter hasError={errors.email}>
        <input
          id="email"
          name="email"
          {...register('email', {
            pattern: {
              value: /\S+@\S+\.\S+/,
              message: 'Please enter a valid email'
            }
          })}
          type="text"
          status={errors.email}
          data-testid="signin-email"
        />
      </S.InputOuter>
      {errors.email ? <S.Message role="error">{errors.email.message}</S.Message> : <S.MessageSpacer />}

      <S.PasswordLabel hasError={errors.password}>
        Password
        <a href={FORGOT_PASSWORD} data-testid="reset-password">
          Forgot Password?
        </a>
      </S.PasswordLabel>
      <S.InputOuter hasError={errors.password}>
        <input
          id="password"
          name="password"
          {...register('password', {
            required: 'Please enter your password'
          })}
          type={showPassword ? 'text' : 'password'}
          status={errors.password}
          data-testid={`signin-pwd-${showPassword ? 'text' : 'password'}`}
        />
        <Tooltip title={showPassword ? 'Hide password' : 'Show password'}>
          <S.Visibility
            data-testid="toggle-password"
            onClick={togglePasswordVisiblity}
            src={showPassword ? visibilityOn : visibilityOff}
            visible={showPassword ? 'true' : ''}
          />
        </Tooltip>
      </S.InputOuter>
      {errors.password ? <S.Message role="error">{errors.password.message}</S.Message> : <S.MessageSpacer />}

      <S.Submit type="submit" disabled={disabled} name="Sign In">
        Sign In
      </S.Submit>
    </form>
  );
}

SignInForm.propTypes = {
  onSubmitSignIn: PropTypes.func,
  loading: PropTypes.bool
};

export default SignInForm;
