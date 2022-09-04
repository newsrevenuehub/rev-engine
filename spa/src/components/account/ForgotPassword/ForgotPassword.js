import { useState, useReducer } from 'react';
import { useForm } from 'react-hook-form';

// AJAX
import axios from 'ajax/axios';
import { FORGOT_PASSWORD_ENDPOINT } from 'ajax/endpoints';

import * as S from '../Account.styled';

import Logobar from 'components/account/common/logobar/Logobar';
import Leftbar from 'components/account/common/leftbar/Leftbar';

import { SIGN_IN } from 'routes';
import YellowSVG from 'assets/images/account/yellow-bar.svg';

// State management
import fetchReducer, { initialState, FETCH_START, FETCH_SUCCESS, FETCH_FAILURE } from 'state/fetch-reducer';

// Analytics
import { useConfigureAnalytics } from '../../analytics';

function ForgotPassword() {
  useConfigureAnalytics();

  const [forgotPasswordState, dispatch] = useReducer(fetchReducer, initialState);
  const formSubmitErrors = forgotPasswordState?.errors?.detail;

  const [infoMessage, setInfoMessage] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm();

  const onSubmitForgotPassword = async (fdata) => {
    dispatch({ type: FETCH_START });
    try {
      const { data, status } = await axios.post(FORGOT_PASSWORD_ENDPOINT, { email: fdata.email });
      setInfoMessage('Success. If your email is registered, an email with instructions has been sent. ');
      dispatch({ type: FETCH_SUCCESS });
    } catch (e) {
      dispatch({ type: FETCH_FAILURE, payload: e?.response?.data });
    }
  };

  let formSubmissionMessage = <S.ErrorSpacer />;
  if (infoMessage) {
    formSubmissionMessage = <S.ErrorMessage>{infoMessage} </S.ErrorMessage>;
  } else if (formSubmitErrors) {
    formSubmissionMessage = <S.ErrorMessage>{formSubmitErrors} </S.ErrorMessage>;
  }

  return (
    <S.Outer>
      <S.Left data-testid="left-yellow">
        <Leftbar />
      </S.Left>
      <S.Right>
        <S.FormElements>
          <S.Heading>Forgot Password</S.Heading>
          <S.Subheading>Enter your email address below and we'll send you a reset link.</S.Subheading>

          <br />
          <form onSubmit={handleSubmit(onSubmitForgotPassword)}>
            <S.InputLabel data-testid={`email-label`} hasError={errors.email}>
              Email
            </S.InputLabel>
            <S.InputOuter hasError={errors.email}>
              <input
                id="email"
                {...register('email', {
                  required: 'Please enter a valid email id',
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: 'Please enter a valid email id'
                  }
                })}
                type="text"
                status={errors.email}
              />
            </S.InputOuter>
            {errors.email ? (
              <S.ErrorMessage data-testid={`error`}>{errors.email.message}</S.ErrorMessage>
            ) : (
              <S.ErrorSpacer />
            )}

            <S.Submit type="submit">Send Reset Link</S.Submit>
          </form>
          {formSubmissionMessage}

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

export default ForgotPassword;
