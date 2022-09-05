import { useState, useReducer } from 'react';
import * as S from '../Account.styled';
import { useForm } from 'react-hook-form';

// AJAX
import axios from 'ajax/axios';
import { TOKEN } from 'ajax/endpoints';

// Routing
import { useHistory } from 'react-router-dom';
import { CONTENT_SLUG } from 'routes';

// State management
import fetchReducer, { initialState, FETCH_START, FETCH_SUCCESS, FETCH_FAILURE } from 'state/fetch-reducer';

import { handleLoginSuccess } from 'components/authentication/util';

// Analytics
import { useConfigureAnalytics } from '../../analytics';

import Logobar from 'components/account/common/logobar/Logobar';
import Leftbar from 'components/account/common/leftbar/Leftbar';

import visibilityOn from 'assets/images/account/visibility_on.png';
import visibilityOff from 'assets/images/account/visibility_off.png';

import { SIGN_UP, FORGOT_PASSWORD } from 'routes';
import YellowSVG from 'assets/images/account/yellow-bar.svg';

function SignIn({ onSuccess, message }) {
  const history = useHistory();

  const [signInState, dispatch] = useReducer(fetchReducer, initialState);

  const [showPassword, setShowPassword] = useState(false);
  const togglePasswordVisiblity = () => {
    setShowPassword(showPassword ? false : true);
  };

  useConfigureAnalytics();

  const handlePostLogin = () => {
    if (onSuccess) onSuccess();
    else history.push(CONTENT_SLUG);
  };

  const formSubmitErrors = signInState?.errors?.detail;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm();
  const onSubmitSignIn = async (fdata) => {
    dispatch({ type: FETCH_START });
    try {
      const { data, status } = await axios.post(TOKEN, { email: fdata.email, password: fdata.password });
      if (status === 200 && data.detail === 'success') {
        handleLoginSuccess(data);
        handlePostLogin();
      }
      dispatch({ type: FETCH_SUCCESS });
    } catch (e) {
      dispatch({ type: FETCH_FAILURE, payload: e?.response?.data });
    }
  };

  return (
    <>
      <S.Outer>
        <S.Left data-testid="left-yellow">
          <Leftbar />
        </S.Left>
        <S.Right>
          <S.FormElements>
            <S.Heading>Welcome Back!</S.Heading>
            <br />

            <form onSubmit={handleSubmit(onSubmitSignIn)}>
              <S.InputLabel data-testid={`email-label`} hasError={errors.email}>
                Email
              </S.InputLabel>
              <S.InputOuter hasError={errors.email}>
                <input
                  id="email"
                  {...register('email', {
                    required: 'Please enter a valid email',
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
              {errors.email ? (
                <S.Message role="error" data-testid="email-error">
                  {errors.email.message}
                </S.Message>
              ) : (
                <S.MessageSpacer />
              )}

              <S.PasswordLabel>
                Password
                <a href={FORGOT_PASSWORD} data-testid="reset-password" tabindex="-1">
                  Forgot Password?
                </a>
              </S.PasswordLabel>
              <S.InputOuter hasError={errors.password}>
                <input
                  id="password"
                  {...register('password', {
                    required: 'Please enter your password'
                  })}
                  type={showPassword ? 'text' : 'password'}
                  status={errors.password}
                  data-testid="signin-password"
                />
                <S.Visibility
                  data-testid="toggle-password"
                  onClick={togglePasswordVisiblity}
                  src={showPassword ? visibilityOn : visibilityOff}
                />
              </S.InputOuter>
              {errors.password ? <S.Message role="error">{errors.password.message}</S.Message> : <S.MessageSpacer />}

              <S.Submit type="submit" role="button">
                Sign In
              </S.Submit>
            </form>
            {formSubmitErrors ? <S.Message isSuccess={false}>{formSubmitErrors} </S.Message> : <S.MessageSpacer />}

            <S.SignInLink>
              Not a member?&nbsp;
              <a href={SIGN_UP} data-testid="create-account">
                Create an account
              </a>
            </S.SignInLink>
          </S.FormElements>

          <Logobar />
        </S.Right>
      </S.Outer>
      <S.BottomBar data-testid={`bottom-yellow-bar`}>
        <S.BottomBarYellowSVG src={YellowSVG} />
      </S.BottomBar>
    </>
  );
}

export default SignIn;
