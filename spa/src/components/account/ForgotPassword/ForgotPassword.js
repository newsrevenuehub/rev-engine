import { useState, useReducer } from 'react';
import { useForm } from 'react-hook-form';

// AJAX
import axios from 'ajax/axios';
import { FORGOT_PASSWORD_ENDPOINT } from 'ajax/endpoints';

import * as S from '../Account.styled';

import ForgotPasswordForm from './ForgotPasswordForm';

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
  const [loading, setLoading] = useState(false);

  const onForgotPasswordSubmit = async (fdata) => {
    setLoading(true);
    dispatch({ type: FETCH_START });
    try {
      await axios.post(FORGOT_PASSWORD_ENDPOINT, { email: fdata.email });
      setInfoMessage('Success. If your email is registered, an email with a reset-link will be sent. ');
      dispatch({ type: FETCH_SUCCESS });
    } catch (e) {
      dispatch({ type: FETCH_FAILURE, payload: e?.response?.data });
    }
    setLoading(false);
  };

  let formSubmissionMessage = <S.MessageSpacer />;
  if (infoMessage) {
    formSubmissionMessage = <S.Message isMessage={true}>{infoMessage} </S.Message>;
  } else if (formSubmitErrors) {
    formSubmissionMessage = <S.Message>{formSubmitErrors} </S.Message>;
  }

  return (
    <S.Outer>
      <S.Left data-testid="left-panel">
        <Leftbar />
      </S.Left>
      <S.Right>
        <S.FormElements>
          <S.Heading>Forgot Password</S.Heading>
          <S.Subheading>Enter your email address below and we'll send you a reset link.</S.Subheading>

          <br />
          <ForgotPasswordForm onForgotPasswordSubmit={onForgotPasswordSubmit} loading={loading} />
          {formSubmissionMessage}

          <S.NavLink>
            <a href={SIGN_IN} data-testid="sign-in">
              Return to Sign In
            </a>
          </S.NavLink>
        </S.FormElements>

        <Logobar />
      </S.Right>
      <S.BottomBar>
        <S.BottomBarYellowSVG src={YellowSVG} data-testid="bottom-yellow-svg" />
      </S.BottomBar>
    </S.Outer>
  );
}

export default ForgotPassword;
