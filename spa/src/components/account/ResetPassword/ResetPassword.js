import { useState } from 'react';

import * as S from './ResetPassword.styled';
import purpleFooterImage from 'assets/images/account/purple-bottombar.png';

import Logobar from 'components/account/common/logobar/Logobar';
import Leftbar from 'components/account/common/leftbar/Leftbar';

import Input from 'elements/inputs/Input';
import InputWrapped from 'components/account/common/elements/InputWrapped';

import { SIGN_IN } from 'routes';

function ResetPassword() {
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmitClick = (event) => {
    setLoading(true);
  };

  const submitDisabled = loading || password === '' || password !== password2;

  return (
    <S.ResetPassword>
      <S.Outer>
        <S.Left>
          <Leftbar />
        </S.Left>
        <S.Right>
          <S.FormElements>
            <S.Heading>Reset Password</S.Heading>
            <S.Subheading>Enter you’re new password below.</S.Subheading>

            <InputWrapped
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              label="Password"
              disabled={loading}
              type={Input.types.PASSWORD}
              testid="signup-password"
              instructions="Password must be 8 characters long and alphanumerical."
            />
            <InputWrapped
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              label="Password"
              disabled={loading}
              type={Input.types.PASSWORD}
              testid="signup-password"
            />

            <br />
            <S.Submit
              type={'neutral'}
              disabled={submitDisabled}
              onClick={loading || submitDisabled ? () => {} : onSubmitClick}
            >
              Reset Password
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
    </S.ResetPassword>
  );
}

export default ResetPassword;
