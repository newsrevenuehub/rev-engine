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

import ResetPasswordForm from './ResetPasswordForm';
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

  const [loading, setLoading] = useState(false);

  const [infoMessage, setInfoMessage] = useState(null);

  const [forgotPasswordState, dispatch] = useReducer(fetchReducer, initialState);
  const formSubmitErrors = forgotPasswordState?.errors?.detail;

  const onResetPasswordSubmit = async (fdata) => {
    setLoading(true);
    dispatch({ type: FETCH_START });
    try {
      const { status } = await axios.post(RESET_PASSWORD_ENDPOINT, {
        token,
        password: fdata.password,
        password1: fdata.password1
      });
      if (status === 200) {
        setInfoMessage('Your password has been successfully changed.');
      } else {
        setInfoMessage('An error occured. Please try again.');
      }
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
      <S.Left data-testid="left">
        <Leftbar />
      </S.Left>
      <S.Right>
        <S.FormElements>
          <S.Heading data-testid="reset-pwd-title">Reset Password!</S.Heading>
          <S.Subheading>Enter your new password below.</S.Subheading>

          <ResetPasswordForm loading={loading} onResetPasswordSubmit={onResetPasswordSubmit} />
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
        <S.BottomBarYellowSVG src={YellowSVG} data-testid="bottom-yellow-png" />
      </S.BottomBar>
    </S.Outer>
  );
}

export default ResetPassword;
