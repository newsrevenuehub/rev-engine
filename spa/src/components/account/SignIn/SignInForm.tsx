import PropTypes, { InferProps } from 'prop-types';
import { FormEvent, useRef, useState } from 'react';
import { Button } from 'components/base';
import PasswordField from 'components/common/TextField/PasswordField/PasswordField';
import { FORGOT_PASSWORD } from 'routes';
import { EmailField, ForgotPasswordLink, PasswordContainer, Root } from './SignInForm.styled';

const SignInFormPropTypes = {
  disabled: PropTypes.bool,
  onSubmit: PropTypes.func.isRequired
};

export interface SignInFormProps extends InferProps<typeof SignInFormPropTypes> {
  onSubmit: (email: string, password: string) => void;
}

export function SignInForm({ disabled, onSubmit }: SignInFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (disabled || !formRef.current || !formRef.current.reportValidity()) {
      return;
    }

    onSubmit(email, password);
  }

  return (
    <Root onSubmit={handleSubmit} ref={formRef}>
      <EmailField
        fullWidth
        id="email"
        label="Email"
        onChange={({ target }) => setEmail(target.value)}
        required
        type="email"
        value={email}
      />
      <PasswordContainer>
        <PasswordField
          fullWidth
          id="password"
          label="Password"
          onChange={({ target }) => setPassword(target.value)}
          required
          value={password}
        />
        <ForgotPasswordLink to={FORGOT_PASSWORD} data-testid="reset-password">
          Forgot Password?
        </ForgotPasswordLink>
      </PasswordContainer>
      <Button fullWidth disabled={!!disabled} type="submit">
        Sign In
      </Button>
    </Root>
  );
}

SignInForm.propTypes = SignInFormPropTypes;
export default SignInForm;
