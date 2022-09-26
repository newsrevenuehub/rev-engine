import { render, screen } from 'test-utils';
import SignUp from './SignUp';
import { SIGN_IN } from 'routes';

it('should show the right revengine logo', () => {
  render(<SignUp />);
  const blueLogo = screen.getByTestId('logo');
  expect(blueLogo).toBeInTheDocument();
});

it('should have purple left bar and yellow bottom bar', () => {
  render(<SignUp />);
  const bottomYellowBar = screen.getByTestId('bottom-yellow-svg');
  expect(bottomYellowBar).toBeInTheDocument();
  const left = screen.getByTestId('left-purple');
  expect(left).toBeInTheDocument();
});

it('should have heading - Create Your Free Account', () => {
  render(<SignUp />);
  const title = screen.getByText('Create Your Free Account');
  expect(title).toBeInTheDocument();
});

it('should have advantages and company icons', () => {
  render(<SignUp />);
  const advantages = screen.getByTestId('advantages');
  expect(advantages).toBeInTheDocument();
  const icons = screen.getByTestId('company-icons');
  expect(icons).toBeInTheDocument();
});

it('should have link to take user to sign in page', () => {
  render(<SignUp />);
  expect(screen.getByTestId('sign-in-link')).toHaveAttribute('href', SIGN_IN);
});
