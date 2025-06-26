import { useMemo, useReducer } from 'react';

// AJAX
import axios from 'ajax/axios';
import { TOKEN, USER } from 'ajax/endpoints';

// State management
import fetchReducer, { FETCH_FAILURE, FETCH_START, FETCH_SUCCESS, initialState } from 'state/fetch-reducer';

import * as S from '../Account.styled';
import SignUpForm from './SignUpForm';

import Leftbar from 'components/account/common/leftbar/Leftbar';
import { IntegrationLogos } from 'components/account/common/IntegrationLogos';
import { Link as RouterLink, useHistory } from 'react-router-dom';

import { handleLoginSuccess } from 'components/authentication/util';
import PageTitle from 'elements/PageTitle';
import { CONTENT_SLUG, SIGN_IN } from 'routes';

import YellowSVG from 'assets/images/account/yellow-bar.svg';
import { SIGN_UP_GENERIC_ERROR_TEXT } from 'constants/textConstants';

// Analytics
import { AxiosError } from 'axios';
import { useConfigureAnalytics } from 'components/analytics';
import { Link } from 'components/base';

// Loosely typing this because we're using the `component` prop, which causes issues with TS.
const LooseLink = Link as any;

function SignUp() {
  const [signUpState, dispatch] = useReducer(fetchReducer, initialState);

  const history = useHistory();
  useConfigureAnalytics();

  const handleLogin = async (email: string, password: string) => {
    dispatch({ type: FETCH_START });
    try {
      const { data, status } = await axios.post(TOKEN, { email, password });
      if (status === 200 && data.detail === 'success') {
        handleLoginSuccess(data);
        history.push(CONTENT_SLUG);
        dispatch({ type: FETCH_SUCCESS });
      } else {
        dispatch({ type: FETCH_FAILURE, payload: data });
      }
    } catch (e: any) {
      dispatch({ type: FETCH_FAILURE, payload: (e as AxiosError).response?.data });
    }
  };

  const onSubmitSignUp = async (email: string, password: string) => {
    dispatch({ type: FETCH_START });
    try {
      const { data, status } = await axios.post(USER, {
        email,
        password,
        accepted_terms_of_service: new Date().toISOString()
      });

      if (status === 201) {
        handleLogin(email, password);
        dispatch({ type: FETCH_SUCCESS, payload: data });
      } else {
        dispatch({ type: FETCH_FAILURE, payload: data });
      }
    } catch (e: any) {
      dispatch({ type: FETCH_FAILURE, payload: (e as AxiosError).response?.data });
    }
  };

  const formSubmissionMessage = useMemo(() => {
    if (signUpState?.errors?.email) {
      if (signUpState?.errors?.email[0] === 'This field must be unique.') {
        return { email: <S.Message>This email is already being used by an account. Try signing in.</S.Message> };
      }
      return { email: <S.Message>Email: {signUpState?.errors?.email}</S.Message> };
    } else if (signUpState?.errors?.password) {
      return { password: <S.Message>{signUpState?.errors?.password}</S.Message> };
    } else if (signUpState?.errors && signUpState?.errors.length !== 0) {
      return { email: <S.Message>{SIGN_UP_GENERIC_ERROR_TEXT}</S.Message> };
    }
    return undefined;
  }, [signUpState]);

  return (
    <S.Outer>
      <PageTitle title="Create Your Free Account" />
      <S.Left isCreateAccountPage={true} data-testid="left-purple">
        <Leftbar isCreateAccountPage={true} />
      </S.Left>
      <S.Right>
        <S.FormElements>
          <S.Heading marginBottom={1}>Create Your Free Account</S.Heading>
          <S.Subheading fontSize="lgx">Start receiving contributions today!</S.Subheading>

          <SignUpForm disabled={signUpState.loading} errorMessage={formSubmissionMessage} onSubmit={onSubmitSignUp} />

          <S.NavLink>
            Already have an account?{' '}
            <LooseLink component={RouterLink} to={SIGN_IN} data-testid="sign-in-link">
              Sign in
            </LooseLink>
          </S.NavLink>
        </S.FormElements>

        <IntegrationLogos />
      </S.Right>
      <S.BottomBar>
        <S.BottomBarYellowSVG src={YellowSVG} data-testid="bottom-yellow-svg" />
      </S.BottomBar>
    </S.Outer>
  );
}

export default SignUp;
