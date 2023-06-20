import { useMemo, useReducer } from 'react';

// AJAX
import axios from 'ajax/axios';
import { TOKEN, USER } from 'ajax/endpoints';

// State management
import fetchReducer, { FETCH_FAILURE, FETCH_START, FETCH_SUCCESS, initialState } from 'state/fetch-reducer';

import * as S from '../Account.styled';
import SignUpForm, { SignUpFormValues } from './SignUpForm';

import Leftbar from 'components/account/common/leftbar/Leftbar';
import Logobar from 'components/account/common/logobar/Logobar';
import { Link, useHistory } from 'react-router-dom';

import { handleLoginSuccess } from 'components/authentication/util';
import PageTitle from 'elements/PageTitle';
import { CONTENT_SLUG, SIGN_IN } from 'routes';

import YellowSVG from 'assets/images/account/yellow-bar.svg';
import { SIGN_UP_GENERIC_ERROR_TEXT } from 'constants/textConstants';

// Analytics
import { AxiosError } from 'axios';
import { useConfigureAnalytics } from 'components/analytics';

function SignUp() {
  const [signUpState, dispatch] = useReducer(fetchReducer, initialState);

  const history = useHistory();
  useConfigureAnalytics();

  const handleLogin = async (fdata: SignUpFormValues) => {
    dispatch({ type: FETCH_START });
    try {
      const { data, status } = await axios.post(TOKEN, fdata);
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

  const onSubmitSignUp = async (fdata: SignUpFormValues) => {
    dispatch({ type: FETCH_START });
    try {
      const { data, status } = await axios.post(USER, {
        email: fdata.email,
        password: fdata.password,
        accepted_terms_of_service: new Date().toISOString()
      });
      if (status === 201) {
        handleLogin(fdata);
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

          <SignUpForm
            onSubmitSignUp={onSubmitSignUp}
            loading={signUpState.loading}
            errorMessage={formSubmissionMessage}
          />

          <S.NavLink>
            Already have an account?{' '}
            <Link to={SIGN_IN} data-testid="sign-in-link">
              Sign in
            </Link>
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

export default SignUp;
