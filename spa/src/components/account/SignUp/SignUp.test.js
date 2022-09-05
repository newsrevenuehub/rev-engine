import { render, screen, fireEvent } from 'test-utils';
import ReactTestUtils from 'react-dom/test-utils';
import SignUp from './SignUp';
import { SIGN_IN } from 'routes';

it('should show the right revengine logo', () => {
  render(<SignUp />);
  const blueLogo = screen.queryByTestId('logo');
  expect(blueLogo).toBeInTheDocument();
});

it('should have purple left bar and yellow bottom bar', () => {
  render(<SignUp />);
  const bottomYellowBar = screen.queryByTestId('bottom-yellow-bar');
  expect(bottomYellowBar).toBeInTheDocument();
  const leftPurple = screen.queryByTestId('left-purple');
  expect(leftPurple).toBeInTheDocument();
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
