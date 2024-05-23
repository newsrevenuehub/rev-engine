import { ResetPasswordFormProps } from '../ResetPasswordForm';

const ResetPasswordForm = ({ disabled, onSubmit, passwordError }: ResetPasswordFormProps) => (
  <div data-testid="reset-password-form" data-error={passwordError}>
    <button disabled={!!disabled} onClick={() => onSubmit('mock-password')}>
      Reset Password
    </button>
  </div>
);

export default ResetPasswordForm;
