import { useState, useReducer } from 'react';
import * as S from './../Account.styled';

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
import { useConfigureAnalytics } from '../../analytics';

import purpleFooterImage from 'assets/images/account/purple-bottombar.png';

import Logobar from 'components/account/common/logobar/Logobar';
import Leftbar from 'components/account/common/leftbar/Leftbar';

import Input from 'elements/inputs/Input';
import InputWrapped from 'components/account/common/elements/InputWrapped';
import validateEmail from 'utilities/validateEmail';

import { SIGN_UP, FORGOT_PASSWORD } from 'routes';

//import validateEmail from 'utilities/validateEmail';

function Login({ onSuccess, message }) {
  const history = useHistory();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [{ loading, errors }, dispatch] = useReducer(fetchReducer, initialState);

  useConfigureAnalytics();

  const handlePostLogin = () => {
    if (onSuccess) onSuccess();
    else history.push(CONTENT_SLUG);
  };

  const onSubmitClick = async (e) => {
    setEmailError('');
    setPasswordError('');

    let hasError = false;

    if (!validateEmail(email)) {
      //setEmailError('Entered email is invalid');
      //hasError = true;
    }

    if (password.length < 8) {
      setPasswordError('Password has to be more than 8 chars long');
      hasError = true;
    }

    if (!hasError) {
      dispatch({ type: FETCH_START });
      try {
        const { data, status } = await axios.post(TOKEN, { email, password });
        if (status === 200 && data.detail === 'success') {
          handleLoginSuccess(data);
          handlePostLogin();
        }
        dispatch({ type: FETCH_SUCCESS });
      } catch (e) {
        dispatch({ type: FETCH_FAILURE, payload: e?.response?.data });
      }
    }
  };

  const submitDisabled = email === '' || password === '' || loading;
  const formSubmitErrors = errors?.detail;

  return (
    <S.Outer>
      <S.Left data-testid={'left-yellow'}>
        <Leftbar />
      </S.Left>
      <S.Right>
        <S.FormElements>
          <S.Heading>Welcome Back!</S.Heading>
          <br />
          <InputWrapped
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            errors={''}
            label="Email"
            disabled={loading}
            type={Input.types.EMAIL}
            testid="signin-email"
            errorMessage={emailError}
          />
          <S.PasswordLabel>
            Password
            <a href={FORGOT_PASSWORD} data-testid={'reset-password'}>
              Forgot Password?
            </a>
          </S.PasswordLabel>
          <InputWrapped
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            errors={''}
            disabled={loading}
            type={Input.types.PASSWORD}
            testid="signin-password"
            instructions="Password must be 8 characters long and alphanumerical."
            errorMessage={passwordError}
          />

          <S.Submit
            type={'neutral'}
            disabled={submitDisabled}
            onClick={loading || submitDisabled ? () => {} : onSubmitClick}
          >
            Sign In
          </S.Submit>

          <br />
          <br />
          {formSubmitErrors && formSubmitErrors !== '' ? (
            <S.ErrorMessage>{formSubmitErrors} </S.ErrorMessage>
          ) : (
            <S.ErrorSpacer />
          )}

          <S.SignInLink>
            Not a member?&nbsp;
            <a href={SIGN_UP} data-testid={'create-account'}>
              Create an account
            </a>
          </S.SignInLink>
        </S.FormElements>

        <Logobar />
      </S.Right>
      <S.BottomBar>
        <S.BottomBarImg data-testid={'bottom-purple-bar'} src={purpleFooterImage} />
      </S.BottomBar>
    </S.Outer>
  );
}

export default Login;
