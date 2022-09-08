import { useReducer } from 'react';

// AJAX
import axios from 'ajax/axios';
import { TOKEN, CREATE_ACCOUNT_ENDPONT } from 'ajax/endpoints';

// State management
import fetchReducer, { initialState, FETCH_START, FETCH_SUCCESS, FETCH_FAILURE } from 'state/fetch-reducer';

import * as S from '../Account.styled';
import SignUpForm from './SignUpForm';

import Logobar from 'components/account/common/logobar/Logobar';
import Leftbar from 'components/account/common/leftbar/Leftbar';
import { useHistory } from 'react-router-dom';

import { handleLoginSuccess } from 'components/authentication/util';
import { CONTENT_SLUG, SIGN_IN } from 'routes';

import YellowSVG from 'assets/images/account/yellow-bar.svg';

// Analytics
import { useConfigureAnalytics } from '../../analytics';

function Header() {
  return (
    <>
      <S.Heading>Create Your Free Account</S.Heading>
      <S.Subheading>Start receiving contributions today!</S.Subheading>
    </>
  );
}

function SignUp({ onSuccess }) {
  const [signUpState, dispatch] = useReducer(fetchReducer, initialState);

  const history = useHistory();
  useConfigureAnalytics();

  const handlePostLogin = () => {
    if (onSuccess) onSuccess();
    else history.push(CONTENT_SLUG);
  };

  const formSubmitErrors = signUpState?.errors?.email;

  const handleLogin = async (fdata) => {
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

  const onSubmitSignUp = async (fdata) => {
    dispatch({ type: FETCH_START });
    try {
      const { data, status } = await axios.post(CREATE_ACCOUNT_ENDPONT, {
        email: fdata.email,
        password: fdata.password,
        accepted_terms_of_service: new Date().toISOString()
      });
      if (status === 201) {
        handleLogin(fdata);
      } else {
        dispatch({ type: FETCH_FAILURE, payload: data });
      }
    } catch (e) {
      dispatch({ type: FETCH_FAILURE, payload: e?.response?.data });
    }
  };

  let formSubmissionMessage = <S.MessageSpacer />;
  if (formSubmitErrors) {
    formSubmissionMessage = <S.Message>{'Email has to be valid and unique.'}</S.Message>;
  }

  return (
    <S.Outer>
      <S.Left isCreateAccountPage={true} data-testid="left-purple">
        <Leftbar isCreateAccountPage={true} />
      </S.Left>
      <S.Right>
        <S.FormElements>
          <Header />

          <SignUpForm onSubmitSignUp={onSubmitSignUp} loading={signUpState.loading} />
          {formSubmissionMessage}

          <S.Disclaimer>By creating an account you agree to adhere to News Revenue Hub’s Code of Ethics.</S.Disclaimer>
          <S.NavLink>
            Already have an account?
            <a href={SIGN_IN} data-testid="sign-in-link">
              Sign in
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

export default SignUp;
