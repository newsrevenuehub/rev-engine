import { useState, useReducer } from 'react';
import * as S from './Login.styled';

// Deps
import queryString from 'query-string';

// AJAX
import axios from 'ajax/axios';
import { TOKEN } from 'ajax/endpoints';

// Routing
import { useLocation, useHistory } from 'react-router-dom';
import { MAIN_CONTENT_SLUG } from 'routes';

// State management
import fetchReducer, { initialState, FETCH_START, FETCH_SUCCESS, FETCH_FAILURE } from 'state/fetch-reducer';

import { handleLoginSuccess } from 'components/authentication/util';
import { PASSWORD_RESET_URL } from 'constants/authConstants';

// Elements
import Input from 'elements/inputs/Input';
import FormErrors from 'elements/inputs/FormErrors';

function Login() {
  const location = useLocation();
  const history = useHistory();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [{ loading, errors }, dispatch] = useReducer(fetchReducer, initialState);

  const routeUserAfterLogin = () => {
    const qs = queryString.parse(location.search);
    if (qs.url) history.push(qs.url);
    else history.push(MAIN_CONTENT_SLUG);
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
        routeUserAfterLogin(location.search);
      }
      dispatch({ type: FETCH_SUCCESS });
    } catch (error) {
      dispatch({ type: FETCH_FAILURE, payload: error.response?.data });
    }
  };

  return (
    <S.Login>
      <S.LoginCard>
        <S.LoginForm>
          <FormErrors errors={errors?.detail} />

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

          <S.LoginButtons>
            <S.LoginButton onClick={handleLogin} disabled={loading} type="submit" data-testid="login-button">
              Sign in
            </S.LoginButton>
            <S.ForgotPasswordLink onClick={handleForgotPassword} data-testid="forgot-password">
              Forgot password
            </S.ForgotPasswordLink>
          </S.LoginButtons>
        </S.LoginForm>
      </S.LoginCard>
    </S.Login>
  );
}

export default Login;
