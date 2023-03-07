import { render, screen } from 'test-utils';
import SignIn from '.';
import { SIGN_UP, FORGOT_PASSWORD } from 'routes';

describe('SignIn Component Tests', () => {
  it('should show the right revengine logo', () => {
    render(<SignIn />);
    const bottomYellowBar = screen.getByTestId('logo2');
    expect(bottomYellowBar).toBeInTheDocument();
  });

  it('should have left section and yellow bottom bar', () => {
    render(<SignIn />);
    const bottomYellowBar = screen.getByTestId('bottom-yellow-svg');
    expect(bottomYellowBar).toBeInTheDocument();
    const leftSection = screen.getByTestId('left-section');
    expect(leftSection).toBeInTheDocument();
  });

  it('should have heading - Welcome Back!', () => {
    render(<SignIn />);
    const title = screen.getByText('Welcome Back!');
    expect(title).toBeInTheDocument();
  });

  it('should have link to take user to sign-in page and reset-password page', () => {
    render(<SignIn />);
    const signUp = screen.getByTestId('create-account');
    expect(signUp).toHaveAttribute('href', SIGN_UP);
    const resetPassword = screen.getByTestId('reset-password');
    expect(resetPassword).toHaveAttribute('href', FORGOT_PASSWORD);
  });
});
