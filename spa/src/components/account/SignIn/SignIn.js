import { useReducer } from 'react';
import * as S from '../Account.styled';

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
import { useConfigureAnalytics } from 'components/analytics';

import SignInForm from './SignInForm';
import Logobar from 'components/account/common/logobar/Logobar';
import Leftbar from 'components/account/common/leftbar/Leftbar';
import PageTitle from 'elements/PageTitle';

import { SIGN_UP } from 'routes';
import YellowSVG from 'assets/images/account/yellow-bar.svg';

function SignIn({ onSuccess }) {
  const history = useHistory();

  const [signInState, dispatch] = useReducer(fetchReducer, initialState);

  useConfigureAnalytics();

  const handlePostLogin = () => {
    if (onSuccess) onSuccess();
    else history.push(CONTENT_SLUG);
  };

  const formSubmitErrors = signInState?.errors?.detail;

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
        <PageTitle title="Sign In" />
        <S.Left data-testid="left-section">
          <Leftbar />
        </S.Left>
        <S.Right>
          <S.FormElements>
            <S.Heading marginBottom={34}>Welcome Back!</S.Heading>

            <SignInForm onSubmitSignIn={onSubmitSignIn} loading={signInState.loading} />
            {formSubmitErrors ? <S.Message>{formSubmitErrors}</S.Message> : <S.MessageSpacer />}

            <S.NavLink>
              Not a member?&nbsp;
              <a href={SIGN_UP} data-testid="create-account">
                Create an account
              </a>
            </S.NavLink>
          </S.FormElements>

          <Logobar />
        </S.Right>
      </S.Outer>
      <S.BottomBar>
        <S.BottomBarYellowSVG src={YellowSVG} data-testid="bottom-yellow-svg" />
      </S.BottomBar>
    </>
  );
}

export default SignIn;
