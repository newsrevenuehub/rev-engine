import { useForm } from 'react-hook-form';
import { useState } from 'react';
import useModal from 'hooks/useModal';
import PropTypes from 'prop-types';

import * as S from '../Account.styled';

import visibilityOn from 'assets/images/account/visibility_on.png';
import visibilityOff from 'assets/images/account/visibility_off.png';

function ResetPasswordForm({ onResetPasswordSubmit, loading }) {
  const { open: showPassword, handleToggle: togglePasswordVisiblity } = useModal();
  const { open: showConfirmPassword, handleToggle: toggleConfirmPasswordVisiblity } = useModal();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm();

  const onSubmit = async (fdata) => {
    onResetPasswordSubmit(fdata);
  };

  const password = watch('password', '');
  const confirmPassword = watch('confirmPassword', '');
  const disabled = !confirmPassword || !password || loading;

  return (
    <form onSubmit={disabled ? () => {} : handleSubmit(onSubmit)}>
      <S.InputLabel hasError={errors.password}>New Password</S.InputLabel>
      <S.InputOuter hasError={errors.password}>
        <input
          id="password"
          {...register('password', {
            required: 'Please enter your password',
            validate: (val: string) => {
              if (val.length < 8 || !/[a-zA-Z]/.test(val) || !/[0-9]/.test(val)) {
                return 'Password should be alphanumeric and at least 8 characters long';
              }
            }
          })}
          type={showPassword ? 'text' : 'password'}
          status={errors.password}
          data-testid={`reset-pwd-${showPassword ? 'text' : 'password'}`}
        />
        <S.Visibility
          onClick={togglePasswordVisiblity}
          src={showPassword ? visibilityOn : visibilityOff}
          data-testid="toggle-password"
        />
      </S.InputOuter>
      <S.Instructions>Password must be 8 characters long and alphanumerical.</S.Instructions>
      {errors.password ? <S.Message role="error">{errors.password.message}</S.Message> : <S.MessageSpacer />}

      <S.InputLabel hasError={errors.confirmPassword}>Confirm Password</S.InputLabel>
      <S.InputOuter hasError={errors.confirmPassword}>
        <input
          id="confirmPassword"
          {...register('confirmPassword', {
            required: 'Please enter your password',
            validate: (val: string) => {
              if (watch('password') !== val) {
                return 'The passwords you entered do not match';
              } else if (val.length < 8 || !/[a-zA-Z]/.test(val) || !/[0-9]/.test(val)) {
                return 'Password should be alphanumeric and at least 8 characters long';
              }
            }
          })}
          type={showConfirmPassword ? 'text' : 'password'}
          data-testid={`reset-pwd1-${showConfirmPassword ? 'text' : 'password'}`}
          status={errors.confirmPassword}
        />
        <S.Visibility
          data-testid="toggle-password1"
          onClick={toggleConfirmPasswordVisiblity}
          src={showConfirmPassword ? visibilityOn : visibilityOff}
        />
      </S.InputOuter>
      <S.Instructions>Password must be 8 characters long and alphanumerical.</S.Instructions>
      {errors.confirmPassword ? (
        <S.Message role="error">{errors.confirmPassword.message}</S.Message>
      ) : (
        <S.MessageSpacer />
      )}

      <S.Submit type="submit" disabled={disabled} name="Reset Password" />
    </form>
  );
}

ResetPasswordForm.propTypes = {
  onResetPasswordSubmit: PropTypes.func,
  loading: PropTypes.bool
};

export default ResetPasswordForm;
