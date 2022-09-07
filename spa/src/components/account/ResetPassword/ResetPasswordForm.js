import React from 'react';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import useModal from 'hooks/useModal';

import * as S from '../Account.styled';

import visibilityOn from 'assets/images/account/visibility_on.png';
import visibilityOff from 'assets/images/account/visibility_off.png';

function ResetPasswordForm({ onResetPasswordSubmit, loading }) {
  const { open: showPassword, handleToggle: togglePasswordVisiblity } = useModal();
  const { open: showPassword1, handleToggle: togglePassword1Visiblity } = useModal();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm();

  const onSubmit = async (fdata) => {
    await onResetPasswordSubmit(fdata);
  };

  const password = watch('password', '');
  const password1 = watch('password1', '');
  const disabled = password1 === '' || password === '' || loading;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <S.InputLabel hasError={errors.password}>Password</S.InputLabel>
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

      <S.InputLabel hasError={errors.password1}>Renter-Password</S.InputLabel>
      <S.InputOuter hasError={errors.password1}>
        <input
          id="password1"
          {...register('password1', {
            required: 'Please enter your password',
            validate: (val: string) => {
              if (val.length < 8 || !/[a-zA-Z]/.test(val) || !/[0-9]/.test(val)) {
                return 'Password should be alphanumeric and at least 8 characters long';
              } else if (watch('password') !== val) {
                return 'Your passwords do no match';
              }
            }
          })}
          type={showPassword1 ? 'text' : 'password'}
          data-testid={`reset-pwd1-${showPassword1 ? 'text' : 'password'}`}
          status={errors.password1}
        />
        <S.Visibility
          data-testid="toggle-password1"
          onClick={togglePassword1Visiblity}
          src={showPassword1 ? visibilityOn : visibilityOff}
        />
      </S.InputOuter>
      <S.Instructions>Password must be 8 characters long and alphanumerical.</S.Instructions>
      {errors.password1 ? <S.Message role="error">{errors.password1.message}</S.Message> : <S.MessageSpacer />}

      <S.Submit type="submit" disabled={disabled} data-testid="reset-pwd-submit">
        {' '}
        Reset Password
      </S.Submit>
    </form>
  );
}

export default ResetPasswordForm;
