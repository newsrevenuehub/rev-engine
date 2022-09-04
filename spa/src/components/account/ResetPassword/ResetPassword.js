import React from 'react';
import { useLocation } from 'react-router-dom';
import { useState, useReducer } from 'react';
import { useForm } from 'react-hook-form';

// AJAX
import axios from 'ajax/axios';
import { RESET_PASSWORD_ENDPOINT } from 'ajax/endpoints';

// State management
import fetchReducer, { initialState, FETCH_START, FETCH_SUCCESS, FETCH_FAILURE } from 'state/fetch-reducer';

import * as S from '../Account.styled';

import Logobar from 'components/account/common/logobar/Logobar';
import Leftbar from 'components/account/common/leftbar/Leftbar';

import { SIGN_IN } from 'routes';
import YellowSVG from 'assets/images/account/yellow-bar.svg';

import visibilityOn from 'assets/images/account/visibility_on.png';
import visibilityOff from 'assets/images/account/visibility_off.png';

// Analytics
import { useConfigureAnalytics } from '../../analytics';

function FetchQueryParams() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

function ResetPassword() {
  useConfigureAnalytics();

  let qParams = FetchQueryParams();
  const token = qParams.get('token');

  const [showPassword, setShowPassword] = useState(false);
  const togglePasswordVisiblity = () => {
    setShowPassword(showPassword ? false : true);
  };

  const [showPassword1, setShowPassword1] = useState(false);
  const togglePassword1Visiblity = () => {
    setShowPassword1(showPassword1 ? false : true);
  };

  const [successMessage, setSuccessMessage] = useState(null);

  const [forgotPasswordState, dispatch] = useReducer(fetchReducer, initialState);
  const formSubmitErrors = forgotPasswordState?.errors?.detail;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm();

  const onSubmitResetPassword = async (fdata) => {
    dispatch({ type: FETCH_START });
    try {
      const { data, status } = await axios.post(RESET_PASSWORD_ENDPOINT, {
        token,
        password: fdata.password,
        password1: fdata.password1
      });
      if (status === 200) {
        console.log(data);
        setSuccessMessage('Your password has been successfully changed.');
      } else {
        setSuccessMessage('An error occured. Please try again.');
      }
      dispatch({ type: FETCH_SUCCESS });
    } catch (e) {
      dispatch({ type: FETCH_FAILURE, payload: e?.response?.data });
    }
  };

  return (
    <S.Outer>
      <S.Left data-testid="left-yellow">
        <Leftbar />
      </S.Left>
      <S.Right>
        <S.FormElements>
          <S.Heading data-testid="reset-pwd-title">Reset Password!</S.Heading>
          <S.Subheading>Enter your new password below.</S.Subheading>
          {token}

          <form onSubmit={handleSubmit(onSubmitResetPassword)}>
            <S.InputLabel data-testid={`password-label`} hasError={errors.email}>
              Password
            </S.InputLabel>
            <S.InputOuter hasError={errors.password}>
              <input
                id="password"
                {...register('password', {
                  required: 'Please enter your password',
                  validate: (val: string) => {
                    if (val.length < 8 || !/[a-zA-Z]/.test(val)) {
                      return 'Password should be alphanumeric and at least 8 characters long';
                    }
                  }
                })}
                type={showPassword ? 'text' : 'password'}
                status={errors.password}
              />
              <S.Visibility
                data-testid="toggle-password"
                onClick={togglePasswordVisiblity}
                src={showPassword ? visibilityOn : visibilityOff}
              />
            </S.InputOuter>
            <S.Instructions>Password must be 8 characters long and alphanumerical.</S.Instructions>
            {errors.password ? (
              <S.ErrorMessage data-testid={`error`}>{errors.password.message}</S.ErrorMessage>
            ) : (
              <S.ErrorSpacer />
            )}

            <S.InputLabel data-testid={`password1-label`} hasError={errors.email}>
              Renter-Password
            </S.InputLabel>
            <S.InputOuter hasError={errors.password}>
              <input
                id="password1"
                {...register('password1', {
                  required: 'Please enter your password',
                  validate: (val: string) => {
                    if (watch('password') != val) {
                      return 'Your passwords do no match';
                    }
                  }
                })}
                type={showPassword1 ? 'text' : 'password'}
                status={errors.password}
              />
              <S.Visibility
                data-testid="toggle-password1"
                onClick={togglePassword1Visiblity}
                src={showPassword1 ? visibilityOn : visibilityOff}
              />
            </S.InputOuter>
            <S.Instructions>Password must be 8 characters long and alphanumerical.</S.Instructions>
            {errors.password1 ? (
              <S.ErrorMessage data-testid={`error`}>{errors.password1.message}</S.ErrorMessage>
            ) : (
              <S.ErrorSpacer />
            )}

            <S.Submit type="submit"> Reset Password</S.Submit>
          </form>
          {formSubmitErrors ? <S.ErrorMessage>{formSubmitErrors} </S.ErrorMessage> : <S.ErrorSpacer />}

          <S.NavLink>
            <a href={SIGN_IN} data-testid="sign-in">
              Return to Sign In
            </a>
          </S.NavLink>
        </S.FormElements>

        <Logobar />
      </S.Right>
      <S.BottomBar data-testid={`bottom-yellow-bar`}>
        <S.BottomBarYellowSVG src={YellowSVG} />
      </S.BottomBar>
    </S.Outer>
  );
}

export default ResetPassword;
