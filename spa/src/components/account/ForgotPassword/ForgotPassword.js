import { useState } from 'react';

import * as S from './ForgotPassword.styled';
import purpleFooterImage from 'assets/images/account/purple-bottombar.png';

import Logobar from 'components/account/common/logobar/Logobar';
import Leftbar from 'components/account/common/leftbar/Leftbar';

import Input from 'elements/inputs/Input';
import InputWrapped from 'components/account/common/elements/InputWrapped';

import { SIGN_IN } from 'routes';

import validateEmail from 'utilities/validateEmail';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const onSubmitClick = (event) => {
    setLoading(true);
    setEmailError('');

    if (!validateEmail(email)) {
      setEmailError('Entered email is invalid');
    }

    if (emailError === '') {
    }
  };

  const submitDisabled = email === '' || loading;

  return (
    <S.ForgotPassword>
      <S.Outer>
        <S.Left>
          <Leftbar />
        </S.Left>
        <S.Right>
          <S.FormElements>
            <S.Heading>Forgot Password</S.Heading>
            <S.Subheading>Enter your email address below and we'll send you a reset link.</S.Subheading>

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

            <br />
            <S.Submit
              type={'neutral'}
              disabled={submitDisabled}
              onClick={loading || submitDisabled ? () => {} : onSubmitClick}
            >
              Send Reset Link
            </S.Submit>

            <S.SignUpToggle>
              <a href={SIGN_IN}>Return to Sign In</a>
            </S.SignUpToggle>
          </S.FormElements>

          <Logobar />
        </S.Right>
        <S.BottomBar>
          <S.BottomBarImg src={purpleFooterImage} />
        </S.BottomBar>
      </S.Outer>
    </S.ForgotPassword>
  );
}

export default ForgotPassword;
