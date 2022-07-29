import { render, screen } from 'test-utils';
import ReactTestUtils from 'react-dom/test-utils';
import ResetPassword from './ResetPassword';
import { SIGN_IN } from 'routes';

it('should should show the yellow revengine logo', () => {
  render(<ResetPassword />);
  const bottomYellowBar = screen.queryByTestId('yellow-logo');
  expect(bottomYellowBar).toBeInTheDocument();
});

it('should should have yellow left bar and purple bottom bar', () => {
  render(<ResetPassword />);
  const bottomYellowBar = screen.queryByTestId('bottom-purple-bar');
  expect(bottomYellowBar).toBeInTheDocument();
  const leftPurple = screen.queryByTestId('left-yellow');
  expect(leftPurple).toBeInTheDocument();
});

it('should have reset-password button button disabled by default', () => {
  render(<ResetPassword />);
  const submitButton = screen.getByRole('button', { name: 'Reset Password' });
  expect(submitButton).not.toBeEnabled();
});

it('should enable reset-password button when email is entered', () => {
  render(<ResetPassword />);
  const submitButton = screen.getByRole('button', { name: 'Reset Password' });
  const password = screen.queryByTestId('reset-password');
  ReactTestUtils.Simulate.change(password, { target: { value: 'password' } });
  expect(submitButton).not.toBeEnabled();
  const password1 = screen.queryByTestId('reset-password-1');
  ReactTestUtils.Simulate.change(password1, { target: { value: 'password' } });
  expect(submitButton).toBeEnabled();
});

it('should have heading - Reset Password', () => {
  render(<ResetPassword />);
  const title = screen.queryByTestId('reset-pwd-title');
  expect(title).toBeInTheDocument();
});

it('should have advantages and company icons', () => {
  render(<ResetPassword />);
  const advantages = screen.queryByTestId('advantages');
  expect(advantages).toBeInTheDocument();
  const icons = screen.queryByTestId('company-icons');
  expect(icons).toBeInTheDocument();
});

it('should have link to take user to sign in page', () => {
  render(<ResetPassword />);
  const signIn = screen.queryByTestId('sign-in');
  expect(signIn).toHaveAttribute('href', SIGN_IN);
});
