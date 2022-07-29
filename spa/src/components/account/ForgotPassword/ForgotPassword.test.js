import { render, screen } from 'test-utils';
import ReactTestUtils from 'react-dom/test-utils';
import ForgotPassword from './ForgotPassword';
import { SIGN_IN } from 'routes';

it('should should show the yellow revengine logo', () => {
  render(<ForgotPassword />);
  const bottomYellowBar = screen.queryByTestId('yellow-logo');
  expect(bottomYellowBar).toBeInTheDocument();
});

it('should should have yellow left bar and purple bottom bar', () => {
  render(<ForgotPassword />);
  const bottomYellowBar = screen.queryByTestId('bottom-purple-bar');
  expect(bottomYellowBar).toBeInTheDocument();
  const leftPurple = screen.queryByTestId('left-yellow');
  expect(leftPurple).toBeInTheDocument();
});

it('should have reset-password button button disabled by default', () => {
  render(<ForgotPassword />);
  const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });
  expect(submitButton).not.toBeEnabled();
});

it('should enable reset-password button when email is entered', () => {
  render(<ForgotPassword />);
  const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });
  const email = screen.queryByTestId('resetpwd-email');
  ReactTestUtils.Simulate.change(email, { target: { value: 'test@test.com' } });
  expect(submitButton).toBeEnabled();
});

it('should have heading - Forgot Password', () => {
  render(<ForgotPassword />);
  const title = screen.queryByText('Forgot Password');
  expect(title).toBeInTheDocument();
});

it('should have advantages and company icons', () => {
  render(<ForgotPassword />);
  const advantages = screen.queryByTestId('advantages');
  expect(advantages).toBeInTheDocument();
  const icons = screen.queryByTestId('company-icons');
  expect(icons).toBeInTheDocument();
});

it('should have link to take user to sign in page', () => {
  render(<ForgotPassword />);
  const signIn = screen.queryByTestId('sign-in');
  expect(signIn).toHaveAttribute('href', SIGN_IN);
});
