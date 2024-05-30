import PropTypes, { InferProps } from 'prop-types';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Button } from 'components/base';
import PasswordField from 'components/common/TextField/PasswordField/PasswordField';
import { Root } from './ResetPasswordForm.styled';

const ResetPasswordFormPropTypes = {
  disabled: PropTypes.bool,
  onSubmit: PropTypes.func.isRequired,
  passwordError: PropTypes.string
};

export interface ResetPasswordFormProps extends InferProps<typeof ResetPasswordFormPropTypes> {
  onSubmit: (password: string) => void;
}

export function ResetPasswordForm({ disabled, onSubmit, passwordError }: ResetPasswordFormProps) {
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Update field validation.

  useEffect(() => {
    if (!confirmPasswordRef.current || !newPasswordRef.current) {
      return;
    }

    confirmPasswordRef.current.setCustomValidity('');
    newPasswordRef.current.setCustomValidity('');

    if (confirmPassword !== newPassword) {
      confirmPasswordRef.current.setCustomValidity('The passwords you entered do not match.');
    }

    if (newPassword.length < 8) {
      newPasswordRef.current.setCustomValidity('Passwords must be at least 8 characters long.');
    }

    // TODO in DEV-4703: remove this validation and show errors from the backend
    // correctly, a la <SignUp> and <SignUpForm>. Until then, we do validation around an all-numeric password.

    if (!/\D/.test(newPassword)) {
      newPasswordRef.current.setCustomValidity('Passwords cannot be only numeric.');
    }
  }, [confirmPassword, newPassword]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (disabled || !formRef.current || !formRef.current.reportValidity()) {
      return;
    }

    onSubmit(newPassword);
  }

  return (
    <Root onSubmit={handleSubmit} ref={formRef}>
      <PasswordField
        fullWidth
        helperText={passwordError ?? 'Password must be at least 8 characters long.'}
        id="new-password"
        inputRef={newPasswordRef}
        label="New Password"
        onChange={({ target }) => setNewPassword(target.value)}
        required
        value={newPassword}
        error={!!passwordError}
      />
      <PasswordField
        fullWidth
        helperText="Password must be at least 8 characters long."
        id="confirm-password"
        inputRef={confirmPasswordRef}
        label="Confirm Password"
        onChange={({ target }) => setConfirmPassword(target.value)}
        required
        value={confirmPassword}
      />
      <Button fullWidth disabled={!!disabled} type="submit">
        Reset Password
      </Button>
    </Root>
  );
}

ResetPasswordForm.propTypes = ResetPasswordFormPropTypes;
export default ResetPasswordForm;
