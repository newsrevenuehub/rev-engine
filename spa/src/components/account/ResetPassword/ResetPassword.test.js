import { render, screen, fireEvent } from 'test-utils';
import ReactTestUtils from 'react-dom/test-utils';
import ResetPassword from './ResetPassword';
import { SIGN_IN } from 'routes';

import Input from 'elements/inputs/Input';

describe('ForgotPassword Tests', () => {
  it('should show the right revengine logo', () => {
    render(<ResetPassword />);
    const bottomYellowBar = screen.queryByTestId('logo2');
    expect(bottomYellowBar).toBeInTheDocument();
  });

  it('should have yellow left bar and purple bottom bar', () => {
    render(<ResetPassword />);
    const bottomYellowBar = screen.queryByTestId('bottom-yellow-png');
    expect(bottomYellowBar).toBeInTheDocument();
    const leftPanel = screen.queryByTestId('left');
    expect(leftPanel).toBeInTheDocument();
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

  it('should have password toggle icon to show/hide value of password if its visibility icon is clicked', () => {
    render(<ResetPassword />);
    const password = screen.queryByTestId(`reset-pwd-${Input.types.PASSWORD}`);
    ReactTestUtils.Simulate.change(password, { target: { value: 'password' } });
    const toggleIcon = screen.getByTestId('toggle-password');
    fireEvent.click(toggleIcon);
    expect(screen.getByTestId(`reset-pwd-${Input.types.TEXT}`)).toBeInTheDocument();
    fireEvent.click(toggleIcon);
    expect(screen.getByTestId(`reset-pwd-${Input.types.PASSWORD}`)).toBeInTheDocument();
  });

  it('should have password toggle icon to show/hide value of password1 if its visibility icon is clicked', () => {
    render(<ResetPassword />);
    const password = screen.queryByTestId(`reset-pwd1-${Input.types.PASSWORD}`);
    ReactTestUtils.Simulate.change(password, { target: { value: 'password' } });
    const toggleIcon = screen.getByTestId('toggle-password1');
    fireEvent.click(toggleIcon);
    expect(screen.getByTestId(`reset-pwd1-${Input.types.TEXT}`)).toBeInTheDocument();
    fireEvent.click(toggleIcon);
    expect(screen.getByTestId(`reset-pwd1-${Input.types.PASSWORD}`)).toBeInTheDocument();
  });

  it('should have link to take user to sign in page', () => {
    render(<ResetPassword />);
    const signIn = screen.queryByTestId('sign-in');
    expect(signIn).toHaveAttribute('href', SIGN_IN);
  });
});
