import { render, screen } from 'test-utils';
import ReactTestUtils from 'react-dom/test-utils';
import SignUp from './SignUp';
import { SIGN_IN } from 'routes';

it('should show the blue revengine logo', () => {
  render(<SignUp />);
  const blueLogo = screen.queryByTestId('blue-logo');
  expect(blueLogo).toBeInTheDocument();
});

it('should have purple left bar and yellow bottom bar', () => {
  render(<SignUp />);
  const bottomYellowBar = screen.queryByTestId('bottom-yellow-bar');
  expect(bottomYellowBar).toBeInTheDocument();
  const leftPurple = screen.queryByTestId('left-purple');
  expect(leftPurple).toBeInTheDocument();
});

it('should have create-account button disabled by default', () => {
  render(<SignUp />);
  const submitButton = screen.getByRole('button', { name: 'Create Account' });
  expect(submitButton).not.toBeEnabled();
});

it('should enable create-account button when email,password are entered and terms checkbox is selected', () => {
  render(<SignUp />);
  const submitButton = screen.getByRole('button', { name: 'Create Account' });

  const email = screen.queryByTestId('signup-email');
  ReactTestUtils.Simulate.change(email, { target: { value: 'test@test.com' } });

  const password = screen.queryByTestId('signup-password');
  ReactTestUtils.Simulate.change(password, { target: { value: 'password' } });
  expect(submitButton).not.toBeEnabled();

  const acceptTermsCheckbox = screen.queryByTestId('acceptTermsCheckbox');
  const inp = acceptTermsCheckbox.querySelector('input[type="checkbox"]');
  ReactTestUtils.Simulate.change(inp, { target: { checked: true } });
  expect(submitButton).toBeEnabled();
});

it('should have heading - Create Your Free Account', () => {
  render(<SignUp />);
  const title = screen.queryByText('Create Your Free Account');
  expect(title).toBeInTheDocument();
});

it('should have advantages and company icons', () => {
  render(<SignUp />);
  const advantages = screen.queryByTestId('advantages');
  expect(advantages).toBeInTheDocument();
  const icons = screen.queryByTestId('company-icons');
  expect(icons).toBeInTheDocument();
});

it('should have link to take user to sign in page', () => {
  render(<SignUp />);

  const signIn = screen.queryByTestId('sign-in');
  expect(signIn).toHaveAttribute('href', SIGN_IN);
});
