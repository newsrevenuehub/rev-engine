import { useState } from 'react';

import * as S from '../Account.styled';

import Logobar from 'components/account/common/logobar/Logobar';
import Leftbar from 'components/account/common/leftbar/Leftbar';

import Input from 'elements/inputs/Input';
import InputWrapped from 'components/account/common/elements/InputWrapped';

import { SIGN_IN } from 'routes';
import YellowSVG from 'assets/images/account/yellow-bar.svg';

// Analytics
import { useConfigureAnalytics } from '../../analytics';

function ResetPassword() {
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [password2Error, setPassword2Error] = useState('');

  useConfigureAnalytics();

  let hasError = false;

  const onSubmitClick = (event) => {
    setPasswordError('');
    setPassword2Error('');

    if (password.length < 8) {
      setPasswordError('Password has to be more than 8 chars long');
      hasError = true;
    }

    if (password2.length < 8) {
      setPassword2Error('Password has to be more than 8 chars long');
      hasError = true;
    }

    if (password !== password2) {
      setPassword2Error('The two Passwords should match');
      hasError = true;
    }

    if (!hasError) {
      setLoading(true);
    }
  };

  const submitDisabled = loading || password === '' || password2 === '';

  return (
    <S.Outer>
      <S.Left data-testid="left-yellow">
        <Leftbar />
      </S.Left>
      <S.Right>
        <S.FormElements>
          <S.Heading data-testid="reset-pwd-title">Reset Password!</S.Heading>
          <S.Subheading>Enter your new password below.</S.Subheading>

          <InputWrapped
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            label="Password"
            disabled={loading}
            type={Input.types.PASSWORD}
            testid="reset-password"
            instructions="Password must be 8 characters long and alphanumerical."
            errorMessage={passwordError}
          />
          <InputWrapped
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            label="Re-enter Password"
            disabled={loading}
            type={Input.types.PASSWORD}
            testid="reset-password-1"
            instructions="Password must be 8 characters long and alphanumerical."
            errorMessage={password2Error}
          />

          <br />
          <S.Submit type={'neutral'} disabled={submitDisabled} onClick={submitDisabled ? () => {} : onSubmitClick}>
            Reset Password
          </S.Submit>

          <S.SignUpToggle>
            <a href={SIGN_IN} data-testid="sign-in">
              Return to Sign In
            </a>
          </S.SignUpToggle>
        </S.FormElements>

        <Logobar />
      </S.Right>
      <S.BottomBar data-testid={`bottom-yellow-bar`}>
        <S.BottomBarYellowSVG src={YellowSVG} />
      </S.BottomBar>
    </S.Outer>
  );
}

export default ResetPassword;
