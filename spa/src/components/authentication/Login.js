import { useState, useReducer } from 'react';
import * as S from './Login.styled';

// Deps
import queryString from 'query-string';

// AJAX
import axios from 'ajax/axios';
import { TOKEN } from 'ajax/endpoints';

// Routing
import { useLocation, useHistory } from 'react-router-dom';
import { DASHBOARD_SLUG } from "routes";

// State management
import fetchReducer, {
  initialState,
  FETCH_START,
  FETCH_SUCCESS,
  FETCH_FAILURE,
} from 'state/fetch-reducer';

import { handleLoginSuccess } from "components/authentication/util";

// Elements
import Input from 'components/elements/inputs/Input';
import FormErrors from 'components/elements/inputs/FormErrors';


function Login() {
  const location = useLocation();
  const history = useHistory();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState("");
  const [{ loading, errors }, dispatch] = useReducer(fetchReducer, initialState);
  
  const routeUserAfterLogin = () => {
    const qs = queryString.parse(location.search);
    if (qs.url && qs.url !== DASHBOARD_SLUG) history.push(qs.url);
    else window.location = "/";
  }

  const handleLogin = async (e) => {
    e.preventDefault(); 
    dispatch({ type: FETCH_START })
    try {
      const { data, status } = await axios.post(TOKEN, { email, password })
      if (status === 200 && data.detail === "success") {
        handleLoginSuccess(data)
        routeUserAfterLogin(location.search)
      }
      dispatch({ type: FETCH_SUCCESS });
    } catch (error) {
      dispatch({ type: FETCH_FAILURE, payload: error.response?.data });
    }
  }


  return (
    <S.Login>
      <S.LoginCard>
        <S.LoginForm>
          <FormErrors errors={errors?.detail}/>

          <S.InputWrapper>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              errors={errors?.email}
              disabled={loading}
              label="email"
              type={Input.types.EMAIL}
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
            />
          </S.InputWrapper>

          <S.LoginButtons>
            <S.LoginButton onClick={handleLogin} disabled={loading} type="submit">
              Sign in
            </S.LoginButton>
          </S.LoginButtons>

        </S.LoginForm>
      </S.LoginCard>
    </S.Login>
  );
}

export default Login;
