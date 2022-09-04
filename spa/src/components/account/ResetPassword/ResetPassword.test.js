import { render, screen, fireEvent } from 'test-utils';
import ReactTestUtils from 'react-dom/test-utils';
import ResetPassword from './ResetPassword';
import { SIGN_IN } from 'routes';

it('should show the right revengine logo', () => {
  render(<ResetPassword />);
  const bottomYellowBar = screen.queryByTestId('logo2');
  expect(bottomYellowBar).toBeInTheDocument();
});

it('should have yellow left bar and purple bottom bar', () => {
  render(<ResetPassword />);
  const bottomYellowBar = screen.queryByTestId('bottom-yellow-bar');
  expect(bottomYellowBar).toBeInTheDocument();
  const leftPurple = screen.queryByTestId('left-yellow');
  expect(leftPurple).toBeInTheDocument();
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
