import { useState } from 'react';

import * as S from './SignUp.styled';
import yellowFooterImage from 'assets/images/account/yellow-bottombar.png';
import purpleFooterImage from 'assets/images/account/purple-bottombar.png';

import Logobar from 'components/account/common/logobar/Logobar';
import Leftbar from 'components/account/common/leftbar/Leftbar';

import Input from 'elements/inputs/Input';
import InputWrapped from 'components/account/common/elements/InputWrapped';

import Checkbox from '@material-ui/core/Checkbox';

import { SIGN_IN } from 'routes';

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
        size="small"
        style={{
          color: '#302436',
          padding: 0
        }}
      />
      &nbsp;I agree to News Revenue Hub’s&nbsp;
      <a href="www.google.com" target="_blank">
        Terms & Conditions
      </a>
      &nbsp;and&nbsp;
      <a href="www.google.com" target="_blank">
        Privacy Policy
      </a>
      .
    </S.AcceptTerms>
  );
}

function SignUp({ onSuccess, message }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [checked, setChecked] = useState(false);

  const handleTOSChange = (event) => {
    setChecked(event.target.checked);
  };

  return (
    <S.SignUp>
      <S.Outer>
        <S.Left>
          <Leftbar page={'sign-upo'} />
        </S.Left>
        <S.Right>
          <S.FormElements>
            <Header />

            <InputWrapped
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              errors={''}
              label="Email"
              type={Input.types.EMAIL}
              testid="signup-email"
              errorMessage={''}
            />
            <InputWrapped
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              errors={''}
              label="Password"
              type={Input.types.PASSWORD}
              testid="signup-password"
              instructions="Password must be 8 characters long and alphanumerical."
              errorMessage={''}
            />

            <AcceptTerms checked={checked} handleTOSChange={handleTOSChange} />
            <br />
            <S.Submit>Create Account</S.Submit>

            <S.Disclaimer>
              By creating an account you agree to adhere to News Revenue Hub’s Code of Ethics.
            </S.Disclaimer>
            <S.SignInToggle>
              Already have an account? <a href={SIGN_IN}>Sign in</a>
            </S.SignInToggle>
          </S.FormElements>

          <Logobar />
        </S.Right>
        <S.BottomBar>
          <S.BottomBarImg src={purpleFooterImage} />
        </S.BottomBar>
      </S.Outer>
    </S.SignUp>
  );
}

export default SignUp;
