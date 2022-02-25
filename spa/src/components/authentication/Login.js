import { useState, useReducer } from 'react';
import * as S from './Login.styled';

// AJAX
import axios from 'ajax/axios';
import { TOKEN } from 'ajax/endpoints';

// Routing
import { useHistory } from 'react-router-dom';
import { CONTENT_SLUG } from 'routes';

// State management
import fetchReducer, { initialState, FETCH_START, FETCH_SUCCESS, FETCH_FAILURE } from 'state/fetch-reducer';

import { setTokenDataToLS } from 'components/authentication/util';
import { PASSWORD_RESET_URL } from 'settings';

// Elements
import Input from 'elements/inputs/Input';
import FormErrors from 'elements/inputs/FormErrors';

// Hooks
import { useConfigureAnalytics } from '../analytics';
import { useOrgPortalContext } from 'components/OrgPortalRouter';

function Login({ onSuccess, message }) {
  const history = useHistory();
  // const { setAvailableOrganizations, setAvailableRevenuePrograms } = useOrgPortalContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [{ loading, errors }, dispatch] = useReducer(fetchReducer, initialState);

  useConfigureAnalytics();

  const handleLoginSuccess = (data) => {
    if (onSuccess) onSuccess();
    history.push('/');
    // else history.push(CONTENT_SLUG);
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
        setTokenDataToLS(data);
        handleLoginSuccess(data);
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
