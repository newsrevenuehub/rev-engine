import PropTypes, { InferProps } from 'prop-types';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Button, Checkbox, FormControlLabel, Link } from 'components/base';
import PasswordField from 'components/common/TextField/PasswordField/PasswordField';
import { PRIVACY_POLICY_URL, TS_AND_CS_URL } from 'constants/helperUrls';
import { EmailField, Root } from './SignUpForm.styled';

const SignUpFormPropTypes = {
  disabled: PropTypes.bool,
  errorMessage: PropTypes.shape({
    password: PropTypes.node,
    email: PropTypes.node
  }),
  onSubmit: PropTypes.func
};

export interface SignUpFormProps extends InferProps<typeof SignUpFormPropTypes> {
  onSubmit: (email: string, password: string) => void;
}

export function SignUpForm({ disabled, errorMessage, onSubmit }: SignUpFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);

  // Update field validation.

  useEffect(() => {
    if (!passwordRef.current) {
      return;
    }

    if (password.length < 8) {
      passwordRef.current.setCustomValidity('Passwords must be at least 8 characters long.');
    } else {
      passwordRef.current.setCustomValidity('');
    }
  }, [password.length]);

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
        error={!!errorMessage?.email}
        fullWidth
        helperText={errorMessage?.email}
        id="email"
        label="Email"
        onChange={({ target }) => setEmail(target.value)}
        required
        type="email"
        value={email}
      />
      <PasswordField
        error={!!errorMessage?.password}
        fullWidth
        helperText={errorMessage?.password ?? 'Password must be at least 8 characters long.'}
        id="password"
        inputRef={passwordRef}
        label="Password"
        onChange={({ target }) => setPassword(target.value)}
        required
        value={password}
      />
      <FormControlLabel
        checked={agreed}
        control={<Checkbox required />}
        label={
          <>
            I agree to News Revenue Hub's{' '}
            <Link href={TS_AND_CS_URL} target="_blank">
              Terms & Conditions
            </Link>{' '}
            and{' '}
            <Link href={PRIVACY_POLICY_URL} target="_blank">
              Privacy Policy
            </Link>
            .
          </>
        }
        onChange={({ target }) => setAgreed((target as HTMLInputElement).checked)}
      />
      <Button disabled={!!disabled} fullWidth type="submit">
        Create Account
      </Button>
    </Root>
  );
}

SignUpForm.propTypes = SignUpFormPropTypes;
export default SignUpForm;
