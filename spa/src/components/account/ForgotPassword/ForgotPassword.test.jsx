import { render, screen } from 'test-utils';
import ForgotPassword from '.';
import { SIGN_IN } from 'routes';

describe('ForgotPassword Tests', () => {
  it('should show the right revengine logo', () => {
    render(<ForgotPassword />);
    const bottomYellowBar = screen.getByTestId('logo2');
    expect(bottomYellowBar).toBeInTheDocument();
  });

  it('should have left bar and yellow bottom bar', () => {
    render(<ForgotPassword />);
    const bottomYellowBar = screen.getByTestId('bottom-yellow-svg');
    expect(bottomYellowBar).toBeInTheDocument();
    const leftPanel = screen.getByTestId('left-panel');
    expect(leftPanel).toBeInTheDocument();
  });

  it('should have heading - Forgot Password', () => {
    render(<ForgotPassword />);
    const title = screen.getByTestId('forgot-pwd-title');
    expect(title).toBeInTheDocument();
  });

  it('should have ForgotPassword Form', () => {
    render(<ForgotPassword />);
    expect(screen.getByRole('button', { type: 'submit' })).toBeInTheDocument();
  });

  it('should have link to take user to sign-in page', () => {
    render(<ForgotPassword />);
    expect(screen.getByRole('link', { href: SIGN_IN })).toBeInTheDocument();
  });
});
