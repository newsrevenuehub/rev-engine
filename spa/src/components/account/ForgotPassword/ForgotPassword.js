import { useState, useReducer, useMemo } from 'react';

// AJAX
import axios from 'ajax/axios';
import { FORGOT_PASSWORD_ENDPOINT } from 'ajax/endpoints';
import { FORGOT_PASSWORD_SUCCESS_TEXT } from 'constants/textConstants';

import * as S from '../Account.styled';

import ForgotPasswordForm from './ForgotPasswordForm';

import Logobar from 'components/account/common/logobar/Logobar';
import Leftbar from 'components/account/common/leftbar/Leftbar';

import { SIGN_IN } from 'routes';
import YellowSVG from 'assets/images/account/yellow-bar.svg';

// State management
import fetchReducer, { initialState, FETCH_START, FETCH_SUCCESS, FETCH_FAILURE } from 'state/fetch-reducer';

// Analytics
import { useConfigureAnalytics } from 'components/analytics';

function ForgotPassword() {
  useConfigureAnalytics();
  const [forgotPasswordState, dispatch] = useReducer(fetchReducer, initialState);
  const formSubmitErrors = forgotPasswordState?.errors?.detail;

  const [infoMessage, setInfoMessage] = useState(null);
  const onForgotPasswordSubmit = async (fdata) => {
    dispatch({ type: FETCH_START });
    try {
      const { data, status } = await axios.post(FORGOT_PASSWORD_ENDPOINT, { email: fdata.email });
      if (status === 200) {
        setInfoMessage(FORGOT_PASSWORD_SUCCESS_TEXT);
        dispatch({ type: FETCH_SUCCESS });
      } else {
        dispatch({ type: FETCH_FAILURE, payload: data });
      }
    } catch (e) {
      dispatch({ type: FETCH_FAILURE, payload: e?.response?.data });
    }
  };

  const formSubmissionMessage = useMemo(() => {
    if (infoMessage) {
      return <S.Message isSuccess={true}>{infoMessage} </S.Message>;
    } else if (formSubmitErrors) {
      return <S.Message>{formSubmitErrors} </S.Message>;
    }
    return <S.MessageSpacer />;
  }, [infoMessage, formSubmitErrors]);

  return (
    <S.Outer>
      <S.Left data-testid="left-panel">
        <Leftbar />
      </S.Left>
      <S.Right>
        <S.FormElements>
          <S.Heading data-testid="forgot-pwd-title">Forgot Password</S.Heading>
          <S.Subheading>Enter your email address below and we'll send you a reset link.</S.Subheading>

          <br />
          <ForgotPasswordForm onForgotPasswordSubmit={onForgotPasswordSubmit} loading={forgotPasswordState.loading} />
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
