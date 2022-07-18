import { useState, useReducer } from 'react';
import * as S from './SignIn.styled';

// AJAX
import axios from 'ajax/axios';
import { TOKEN } from 'ajax/endpoints';

// Routing
import { useHistory } from 'react-router-dom';
import { CONTENT_SLUG } from 'routes';

// State management
import fetchReducer, { initialState, FETCH_START, FETCH_SUCCESS, FETCH_FAILURE } from 'state/fetch-reducer';

import { handleLoginSuccess } from 'components/authentication/util';
import { PASSWORD_RESET_URL } from 'settings';

// Elements
import FormErrors from 'elements/inputs/FormErrors';

// Analytics
import { useConfigureAnalytics } from '../../analytics';

import purpleFooterImage from 'assets/images/account/purple-bottombar.png';

import Logobar from 'components/account/common/logobar/Logobar';
import Leftbar from 'components/account/common/leftbar/Leftbar';

import Input from 'elements/inputs/Input';
import InputWrapped from 'components/account/common/elements/InputWrapped';

import { SIGN_UP, FORGOT_PASSWORD } from 'routes';

import validateEmail from 'utilities/validateEmail';

function Login2({ onSuccess, message }) {
  const history = useHistory();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [{ loading, errors }, dispatch] = useReducer(fetchReducer, initialState);

  useConfigureAnalytics();

  const handlePostLogin = () => {
    if (onSuccess) onSuccess();
    else history.push(CONTENT_SLUG);
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    window.location = PASSWORD_RESET_URL;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
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
  };

  return (
    <S.Login>
      <S.LoginCard>
        {message && <S.Message>{message}</S.Message>}
        <S.LoginForm>
          <S.InputWrapper>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              errors={errors?.email}
              disabled={loading}
              label="email"
              type={Input.types.EMAIL}
              testid="login-email"
            />
          </S.InputWrapper>

          <S.InputWrapper>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              errors={errors?.password}
              disabled={loading}
              label="password"
              type={Input.types.PASSWORD}
              testid="login-password"
            />
          </S.InputWrapper>

          <FormErrors errors={errors?.detail} />

          <S.LoginButtons>
            <S.LoginButton onClick={handleLogin} disabled={loading} type="submit" data-testid="login-button">
              Sign in.
            </S.LoginButton>
          </S.LoginButtons>
        </S.LoginForm>
      </S.LoginCard>
    </S.Login>
  );
}

function Login({ onSuccess, message }) {
  const history = useHistory();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');

  const [{ loading, errors }, dispatch] = useReducer(fetchReducer, initialState);

  useConfigureAnalytics();

  const handlePostLogin = () => {
    if (onSuccess) onSuccess();
    else history.push(CONTENT_SLUG);
  };

  const onSubmitClick = async (e) => {
    setEmailError('');

    /*
    if (!validateEmail(email)) {
      setEmailError('Entered email is invalid');
    }*/

    if (emailError === '' && password !== '') {
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

  return (
    <S.SignIn>
      <S.Outer>
        <S.Left>
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
              testid="signup-email"
              errorMessage={emailError}
            />
            <S.PasswordLabel>
              Password
              <a href={FORGOT_PASSWORD}>Forgot Password?</a>
            </S.PasswordLabel>
            <InputWrapped
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              errors={''}
              disabled={loading}
              type={Input.types.PASSWORD}
              testid="signup-password"
              instructions="Password must be 8 characters long and alphanumerical."
            />
            {errors?.detail} <br />
            <br />
            <S.Submit
              type={'neutral'}
              disabled={submitDisabled}
              onClick={loading || submitDisabled ? () => {} : onSubmitClick}
            >
              Sign In
            </S.Submit>
            <S.SignInLink>
              Not a member?&nbsp;<a href={SIGN_UP}>Create an account</a>
            </S.SignInLink>
          </S.FormElements>

          <Logobar />
        </S.Right>
        <S.BottomBar>
          <S.BottomBarImg src={purpleFooterImage} />
        </S.BottomBar>
      </S.Outer>
    </S.SignIn>
  );
}

export default Login;
