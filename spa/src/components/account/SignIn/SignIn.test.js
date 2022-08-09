import { render, screen } from 'test-utils';
import ReactTestUtils from 'react-dom/test-utils';
import SignIn from './SignIn';
import { SIGN_UP, FORGOT_PASSWORD } from 'routes';

it('should show the blue revengine logo', () => {
  render(<SignIn />);
  const bottomYellowBar = screen.queryByTestId('yellow-logo');
  expect(bottomYellowBar).toBeInTheDocument();
});

it('should have yellow left bar and purple bottom bar', () => {
  render(<SignIn />);
  const bottomYellowBar = screen.queryByTestId('bottom-yellow-bar');
  expect(bottomYellowBar).toBeInTheDocument();
  const leftPurple = screen.queryByTestId('left-yellow');
  expect(leftPurple).toBeInTheDocument();
});

it('should have sign-in button disabled by default', () => {
  render(<SignIn />);
  const submitButton = screen.getByRole('button', { name: 'Sign In' });
  expect(submitButton).not.toBeEnabled();
});

it('should enable sign-in button when email,password are entered', () => {
  render(<SignIn />);
  const submitButton = screen.getByRole('button', { name: 'Sign In' });
  const email = screen.queryByTestId('signin-email');
  ReactTestUtils.Simulate.change(email, { target: { value: 'test@test.com' } });
  const password = screen.queryByTestId('signin-password');
  ReactTestUtils.Simulate.change(password, { target: { value: 'password' } });
  expect(submitButton).toBeEnabled();
});

it('should have heading - Welcome Back!', () => {
  render(<SignIn />);
  const title = screen.queryByText('Welcome Back!');
  expect(title).toBeInTheDocument();
});

it('should have link to take user to sign in page and reset password page', () => {
  render(<SignIn />);
  const signUp = screen.queryByTestId('create-account');
  expect(signUp).toHaveAttribute('href', SIGN_UP);

  const resetPassword = screen.queryByTestId('reset-password');
  expect(resetPassword).toHaveAttribute('href', FORGOT_PASSWORD);
});
