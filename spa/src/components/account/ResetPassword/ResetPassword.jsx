import { Link, useLocation } from 'react-router-dom';
import { useState, useReducer, useMemo } from 'react';

// AJAX
import axios from 'ajax/axios';
import { RESET_PASSWORD_ENDPOINT } from 'ajax/endpoints';
import { RESET_PASSWORD_SUCCESS_TEXT } from 'constants/textConstants';

// State management
import fetchReducer, { initialState, FETCH_START, FETCH_SUCCESS, FETCH_FAILURE } from 'state/fetch-reducer';

import * as S from '../Account.styled';

import ResetPasswordForm from './ResetPasswordForm';
import Logobar from 'components/account/common/logobar/Logobar';
import Leftbar from 'components/account/common/leftbar/Leftbar';
import PageTitle from 'elements/PageTitle';

import { SIGN_IN } from 'routes';
import YellowSVG from 'assets/images/account/yellow-bar.svg';

// Analytics
import { useConfigureAnalytics } from 'components/analytics';

function ResetPassword() {
  useConfigureAnalytics();
  const { search } = useLocation();
  const token = useMemo(() => new URLSearchParams(search), [search]).get('token');

  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState(false);

  const [resetPasswordState, dispatch] = useReducer(fetchReducer, initialState);
  const formSubmitErrors = resetPasswordState?.errors?.detail;

  const onResetPasswordSubmit = async (password) => {
    dispatch({ type: FETCH_START });
    try {
      const { data, status } = await axios.post(RESET_PASSWORD_ENDPOINT, { token, password });

      if (status === 200) {
        setPasswordUpdateSuccess(true);
        dispatch({ type: FETCH_SUCCESS });
      } else {
        dispatch({ type: FETCH_FAILURE, payload: data });
      }
    } catch (e) {
      dispatch({ type: FETCH_FAILURE, payload: e?.response?.data });
    }
  };

  const formSubmissionMessage = useMemo(() => {
    if (formSubmitErrors) {
      return <S.Message>{formSubmitErrors}</S.Message>;
    }
    return <S.MessageSpacer />;
  }, [formSubmitErrors]);

  return (
    <S.Outer>
      <PageTitle title="Reset Password" />
      <S.Left data-testid="left">
        <Leftbar />
      </S.Left>
      <S.Right>
        <S.FormElements shorten={passwordUpdateSuccess}>
          <S.Heading data-testid="reset-pwd-title">{passwordUpdateSuccess ? 'Success!' : 'Reset Password'}</S.Heading>
          <S.Subheading shorten={passwordUpdateSuccess}>
            {passwordUpdateSuccess ? RESET_PASSWORD_SUCCESS_TEXT : 'Enter your new password below.'}
          </S.Subheading>

          {!passwordUpdateSuccess ? (
            <>
              <ResetPasswordForm disabled={resetPasswordState.loading} onSubmit={onResetPasswordSubmit} />
              {formSubmissionMessage}
            </>
          ) : null}

          <S.NavLink alignLeft={passwordUpdateSuccess}>
            <Link to={SIGN_IN} data-testid="sign-in">
              Return to Sign In
            </Link>
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
