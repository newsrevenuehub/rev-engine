import { useState, useReducer } from 'react';
import { useForm } from 'react-hook-form';

// AJAX
import axios from 'ajax/axios';
import { TOKEN, CREATE_ACCOUNT_ENDPONT } from 'ajax/endpoints';

// State management
import fetchReducer, { initialState, FETCH_START, FETCH_SUCCESS, FETCH_FAILURE } from 'state/fetch-reducer';

import * as S from '../Account.styled';

import Logobar from 'components/account/common/logobar/Logobar';
import Leftbar from 'components/account/common/leftbar/Leftbar';
import { useHistory } from 'react-router-dom';

import visibilityOn from 'assets/images/account/visibility_on.png';
import visibilityOff from 'assets/images/account/visibility_off.png';

import Checkbox from '@material-ui/core/Checkbox';

import { handleLoginSuccess } from 'components/authentication/util';
import { CONTENT_SLUG, SIGN_IN, VERIFY_EMAIL_SUCCESS } from 'routes';

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

function AcceptTerms({ checked, handleTOSChange }) {
  return (
    <S.AcceptTerms>
      <Checkbox
        checked={checked}
        onChange={handleTOSChange}
        data-testid={`acceptTermsCheckbox`}
        size="small"
        style={{
          color: '#302436',
          padding: 0
        }}
      />
      &nbsp;I agree to News Revenue Hub’s&nbsp;
      <a href="https://fundjournalism.org/faq/terms-of-service/" rel="noreferrer" target="_blank">
        Terms & Conditions
      </a>
      &nbsp;and&nbsp;
      <a href="https://fundjournalism.org/faq/privacy-policy/" rel="noreferrer" target="_blank">
        Privacy Policy
      </a>
      .
    </S.AcceptTerms>
  );
}

function SignUp({ onSuccess }) {
  const [checked, setChecked] = useState(false);
  const [signUpState, dispatch] = useReducer(fetchReducer, initialState);
  const [infoMessage, setInfoMessage] = useState(null);

  const [showPassword, setShowPassword] = useState(false);
  const togglePasswordVisiblity = () => {
    setShowPassword(showPassword ? false : true);
  };

  const history = useHistory();
  useConfigureAnalytics();

  const handleTOSChange = (event) => {
    setChecked(event.target.checked);
  };

  const handlePostLogin = () => {
    if (onSuccess) onSuccess();
    else history.push(CONTENT_SLUG);
  };

  const formSubmitErrors = signUpState?.errors?.email;

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm();

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
    if (!checked) {
      return;
    }

    const accepted_terms_of_service = new Date().toISOString();

    dispatch({ type: FETCH_START });
    try {
      const { data, status } = await axios.post(CREATE_ACCOUNT_ENDPONT, {
        email: fdata.email,
        password: fdata.password,
        accepted_terms_of_service
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
  } else if (infoMessage) {
    formSubmissionMessage = <S.Message>{infoMessage} </S.Message>;
  }

  return (
    <S.Outer>
      <S.Left bgColor="purple" data-testid={'left-purple'}>
        <Leftbar bgColor="purple" page={'create-account'} />
      </S.Left>
      <S.Right>
        <S.FormElements>
          <Header />

          <form onSubmit={handleSubmit(onSubmitSignUp)}>
            <S.InputLabel data-testid={`email-label`} hasError={errors.email}>
              Email
            </S.InputLabel>
            <S.InputOuter hasError={errors.email}>
              <input
                id="email"
                {...register('email', {
                  required: 'Please enter a valid email',
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: 'Please enter a valid email'
                  }
                })}
                type="text"
                status={errors.email}
                data-testid="signin-email"
              />
            </S.InputOuter>
            {errors.email ? (
              <S.Message role="error" data-testid="email-error">
                {errors.email.message}
              </S.Message>
            ) : (
              <S.MessageSpacer />
            )}

            <S.InputLabel>Password</S.InputLabel>
            <S.InputOuter hasError={errors.password}>
              <input
                id="password"
                {...register('password', {
                  required: 'Please enter your password',
                  validate: (val: string) => {
                    if (val.length < 8 || !/[a-zA-Z]/.test(val)) {
                      return 'Password should be alphanumeric and at least 8 characters long';
                    }
                  }
                })}
                type={showPassword ? 'text' : 'password'}
                status={errors.password}
              />
              <S.Visibility
                data-testid="toggle-password"
                onClick={togglePasswordVisiblity}
                src={showPassword ? visibilityOn : visibilityOff}
              />
            </S.InputOuter>
            {errors.password ? <S.Message role="error">{errors.password.message}</S.Message> : <S.MessageSpacer />}
            <AcceptTerms checked={checked} handleTOSChange={handleTOSChange} />
            <br />
            <S.Submit type="submit" role="button">
              Create Account
            </S.Submit>
          </form>
          {formSubmissionMessage}

          <S.Disclaimer>By creating an account you agree to adhere to News Revenue Hub’s Code of Ethics.</S.Disclaimer>
          <S.NavLink>
            Already have an account?{' '}
            <a href={SIGN_IN} data-testid={`sign-in`}>
              Sign in
            </a>
          </S.NavLink>
        </S.FormElements>

        <Logobar />
      </S.Right>
      <S.BottomBar data-testid={`bottom-yellow-bar`}>
        <S.BottomBarYellowSVG src={YellowSVG} />
      </S.BottomBar>
    </S.Outer>
  );
}

export default SignUp;
