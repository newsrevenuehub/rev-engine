import { Link } from 'components/base';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useState, useReducer, useMemo } from 'react';

// AJAX
import axios from 'ajax/axios';
import { RESET_PASSWORD_ENDPOINT } from 'ajax/endpoints';
import { RESET_PASSWORD_SUCCESS_TEXT } from 'constants/textConstants';

// State management
import fetchReducer, { initialState, FETCH_START, FETCH_SUCCESS, FETCH_FAILURE } from 'state/fetch-reducer';

import * as S from '../Account.styled';

import ResetPasswordForm from './ResetPasswordForm';
import { IntegrationLogos } from 'components/account/common/IntegrationLogos/IntegrationLogos';
import Leftbar from 'components/account/common/leftbar/Leftbar';
import PageTitle from 'elements/PageTitle';

import { SIGN_IN } from 'routes';
import YellowSVG from 'assets/images/account/yellow-bar.svg';

// Analytics
import { useConfigureAnalytics } from 'components/analytics';
import { AxiosError } from 'axios';

// Loosely typing this because we're using the `component` prop, which causes issues with TS.
const LooseLink = Link as any;

function ResetPassword() {
  useConfigureAnalytics();
  const { search } = useLocation();
  const token = useMemo(() => new URLSearchParams(search), [search]).get('token');

  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState(false);

  const [resetPasswordState, dispatch] = useReducer(fetchReducer, initialState);
  const formSubmitErrors = resetPasswordState?.errors?.detail;

  const onResetPasswordSubmit = async (password: string) => {
    dispatch({ type: FETCH_START });
    try {
      const { data, status } = await axios.post(RESET_PASSWORD_ENDPOINT, { token, password });

      if (status === 200) {
        setPasswordUpdateSuccess(true);
        dispatch({ type: FETCH_SUCCESS });
      } else {
        console.error(`Reset password failed with status = ${status} and data = ${data}`);
        dispatch({ type: FETCH_FAILURE, payload: data });
      }
    } catch (e) {
      dispatch({
        type: FETCH_FAILURE,
        payload: (e as AxiosError)?.response?.data || { detail: 'An error occurred. Please try again.' }
      });
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
              <ResetPasswordForm
                disabled={resetPasswordState.loading}
                onSubmit={onResetPasswordSubmit}
                passwordError={resetPasswordState.errors?.password?.[0]}
              />
              {formSubmissionMessage}
            </>
          ) : null}

          <S.NavLink alignLeft={passwordUpdateSuccess}>
            <LooseLink component={RouterLink} to={SIGN_IN} data-testid="sign-in">
              Return to Sign In
            </LooseLink>
          </S.NavLink>
        </S.FormElements>

        <IntegrationLogos />
      </S.Right>
      <S.BottomBar>
        <S.BottomBarYellowSVG src={YellowSVG} data-testid="bottom-yellow-png" />
      </S.BottomBar>
    </S.Outer>
  );
}

export default ResetPassword;
