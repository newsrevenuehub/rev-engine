import { useState, useReducer } from 'react';
import * as S from './Login.styled';

// State management
import fetchReducer, {
  initialState,
  FETCH_START,
  FETCH_SUCCESS,
  FETCH_FAILURE,
} from 'state/fetch-reducer';

// Elements
import Input from 'components/elements/inputs/Input';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState("");
  const [{ loading, errors }, dispatch] = useReducer(fetchReducer, initialState);
  
  const handleLogin = async e => {
    e.preventDefault(); 
    dispatch({ type: FETCH_START })
    try {
      // const response = axios.post()
      dispatch({ type: FETCH_SUCCESS });
    } catch (e) {
      dispatch({ type: FETCH_FAILURE, payload: e.response.errors });
    }
  }


  return (
    <S.Login>
      <S.LoginCard>
        <S.LoginForm>
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
            <S.LoginButton onClick={handleLogin} disabled={loading}>
              Sign in
            </S.LoginButton>
          </S.LoginButtons>
        </S.LoginForm>
      </S.LoginCard>
    </S.Login>
  );
}

export default Login;
