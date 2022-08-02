import { useState } from 'react';

import * as S from '../Account.styled';
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
    let hasError = false;

    if (!validateEmail(email)) {
      setEmailError('Entered email is invalid');
      hasError = true;
    }

    if (!hasError) {
    }
  };

  const submitDisabled = email === '' || loading;

  return (
    <S.Outer>
      <S.Left data-testid="left-yellow">
        <Leftbar />
      </S.Left>
      <S.Right>
        <S.FormElements>
          <S.Heading>Forgot Password</S.Heading>
          <S.Subheading>Enter your email address below and we'll send you a reset link.</S.Subheading>

          <InputWrapped
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            label="Email"
            disabled={loading}
            type={Input.types.EMAIL}
            testid="resetpwd-email"
            errorMessage={emailError}
          />

          <br />
          <S.Submit type={'neutral'} disabled={submitDisabled} onClick={submitDisabled ? () => {} : onSubmitClick}>
            Send Reset Link
          </S.Submit>

          <S.SignUpToggle>
            <a href={SIGN_IN} data-testid="sign-in">
              Return to Sign In
            </a>
          </S.SignUpToggle>
        </S.FormElements>

        <Logobar />
      </S.Right>
      <S.BottomBar>
        <S.BottomBarImg data-testid="bottom-purple-bar" src={purpleFooterImage} />
      </S.BottomBar>
    </S.Outer>
  );
}

export default ForgotPassword;
