import { render, screen } from 'test-utils';
import ResetPassword from '.';
import { SIGN_IN } from 'routes';

describe('ForgotPassword Tests', () => {
  it('should show the right revengine logo', () => {
    render(<ResetPassword />);
    const bottomYellowBar = screen.getByTestId('logo2');
    expect(bottomYellowBar).toBeInTheDocument();
  });

  it('should have yellow left bar and purple bottom bar', () => {
    render(<ResetPassword />);
    const bottomYellowBar = screen.getByTestId('bottom-yellow-png');
    expect(bottomYellowBar).toBeInTheDocument();
    const leftPanel = screen.getByTestId('left');
    expect(leftPanel).toBeInTheDocument();
  });

  it('should have heading - Reset Password', () => {
    render(<ResetPassword />);
    const title = screen.getByTestId('reset-pwd-title');
    expect(title).toBeInTheDocument();
  });

  it('should have advantages and company icons', () => {
    render(<ResetPassword />);
    const advantages = screen.getByTestId('advantages');
    expect(advantages).toBeInTheDocument();
    const icons = screen.getByTestId('company-icons');
    expect(icons).toBeInTheDocument();
  });

  it('should have ResetPassword Form', () => {
    render(<ResetPassword />);
    expect(screen.getByRole('button', { name: 'Reset Password' })).toBeInTheDocument();
  });

  it('should have link to take user to sign in page', () => {
    render(<ResetPassword />);
    expect(screen.getByRole('link', { href: SIGN_IN })).toBeInTheDocument();
  });
});
