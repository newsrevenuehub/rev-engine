import { Button } from 'components/base';
import PropTypes, { InferProps } from 'prop-types';
import { FormEvent, useRef, useState } from 'react';
import { EmailField, Root } from './ForgotPasswordForm.styled';

const ForgotPasswordFormPropTypes = {
  onSubmit: PropTypes.func,
  disabled: PropTypes.bool
};

export interface ForgotPasswordFormProps extends InferProps<typeof ForgotPasswordFormPropTypes> {
  onSubmit: (email: string) => void;
}

function ForgotPasswordForm({ disabled, onSubmit }: ForgotPasswordFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (disabled || !formRef.current || !formRef.current.reportValidity()) {
      return;
    }

    onSubmit(email);
  }
  return (
    <Root onSubmit={handleSubmit} ref={formRef}>
      <EmailField
        fullWidth
        id="reset-email"
        label="Email"
        onChange={({ target }) => setEmail(target.value)}
        required
        type="email"
        value={email}
      />
      <Button disabled={!!disabled} fullWidth type="submit">
        Send Reset Link
      </Button>
    </Root>
  );
}

ForgotPasswordForm.propTypes = ForgotPasswordFormPropTypes;
export default ForgotPasswordForm;
