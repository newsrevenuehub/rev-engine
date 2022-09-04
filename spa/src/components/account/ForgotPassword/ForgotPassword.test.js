import { render, screen } from 'test-utils';
import ReactTestUtils from 'react-dom/test-utils';
import ForgotPassword from './ForgotPassword';
import { SIGN_IN } from 'routes';

it('should show the right revengine logo', () => {
  render(<ForgotPassword />);
  const bottomYellowBar = screen.queryByTestId('logo2');
  expect(bottomYellowBar).toBeInTheDocument();
});

it('should have yellow left bar and purple bottom bar', () => {
  render(<ForgotPassword />);
  const bottomYellowBar = screen.queryByTestId('bottom-yellow-bar');
  expect(bottomYellowBar).toBeInTheDocument();
  const leftPurple = screen.queryByTestId('left-yellow');
  expect(leftPurple).toBeInTheDocument();
});

it('should have heading - Forgot Password', () => {
  render(<ForgotPassword />);
  const title = screen.queryByText('Forgot Password');
  expect(title).toBeInTheDocument();
});

it('should have link to take user to sign in page', () => {
  render(<ForgotPassword />);
  const signIn = screen.queryByTestId('sign-in');
  expect(signIn).toHaveAttribute('href', SIGN_IN);
});
