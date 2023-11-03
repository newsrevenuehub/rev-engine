import { render, screen, fireEvent, waitFor } from 'test-utils';
import ResetPasswordForm from './ResetPasswordForm';

import Input from 'elements/inputs/Input';

const mockSubmit = jest.fn((email, password) => {
  return Promise.resolve({ email, password });
});

describe('ResetPasswordForm Tests', () => {
  function getScreen() {
    return render(<ResetPasswordForm onResetPasswordSubmit={mockSubmit} loading={false} />);
  }

  it('should have password toggle icon to show/hide value of password if its visibility icon is clicked', () => {
    getScreen();
    const password = screen.getByTestId(`reset-pwd-${Input.types.PASSWORD}`);
    fireEvent.input(password, {
      target: {
        value: 'password'
      }
    });
    const toggleIcon = screen.getByTestId('toggle-password');
    fireEvent.click(toggleIcon);
    expect(password.getAttribute('type')).toEqual(Input.types.TEXT);
    fireEvent.click(toggleIcon);
    expect(password.getAttribute('type')).toEqual(Input.types.PASSWORD);
  });

  it('should have password toggle icon to show/hide value of confirmPassword if its visibility icon is clicked', () => {
    getScreen();
    const password = screen.getByTestId(`reset-pwd1-${Input.types.PASSWORD}`);
    fireEvent.input(password, {
      target: {
        value: 'password'
      }
    });
    expect(password.getAttribute('type')).toEqual(Input.types.PASSWORD);
    const toggleIcon = screen.getByTestId('toggle-confirmPassword');
    fireEvent.click(toggleIcon);
    expect(password.getAttribute('type')).toEqual(Input.types.TEXT);
    fireEvent.click(toggleIcon);
    expect(password.getAttribute('type')).toEqual(Input.types.PASSWORD);
  });

  it('should not submit if both passwords are blank', async () => {
    getScreen();
    fireEvent.submit(screen.getByRole('button'));
    await waitFor(() => expect(screen.queryAllByRole('error')).toHaveLength(0));
    expect(mockSubmit).not.toBeCalled();
  });

  it('should not submit if one password in blank and other is not blank', async () => {
    getScreen();
    fireEvent.input(screen.getByTestId(`reset-pwd-password`), {
      target: {
        value: 'password'
      }
    });
    fireEvent.submit(screen.getByRole('button'));
    await waitFor(() => expect(screen.queryAllByRole('error')).toHaveLength(0));
    expect(mockSubmit).not.toBeCalled();
  });

  it('should not submit if both passwords are valid and do not match', async () => {
    getScreen();
    fireEvent.input(screen.getByTestId(`reset-pwd-password`), {
      target: {
        value: 'password12#4'
      }
    });

    fireEvent.input(screen.getByTestId(`reset-pwd1-password`), {
      target: {
        value: 'password23235'
      }
    });

    fireEvent.submit(screen.getByRole('button'));
    await waitFor(() => expect(screen.queryAllByRole('error')).toHaveLength(1));
    expect(mockSubmit).not.toBeCalled();
  });

  it('should not submit if both passwords are invalid and do match', async () => {
    getScreen();
    fireEvent.input(screen.getByTestId(`reset-pwd-password`), {
      target: {
        value: 'password'
      }
    });

    fireEvent.input(screen.getByTestId(`reset-pwd1-password`), {
      target: {
        value: 'password'
      }
    });

    fireEvent.submit(screen.getByRole('button'));
    await waitFor(() => expect(screen.queryAllByRole('error')).toHaveLength(2));
    expect(mockSubmit).not.toBeCalled();
  });

  it('should submit if both passwords are valid and match', async () => {
    getScreen();
    fireEvent.input(screen.getByTestId(`reset-pwd-password`), {
      target: {
        value: 'password12#4'
      }
    });

    fireEvent.input(screen.getByTestId(`reset-pwd1-password`), {
      target: {
        value: 'password12#4'
      }
    });

    fireEvent.submit(screen.getByRole('button'));
    await waitFor(() => expect(screen.queryAllByRole('error')).toHaveLength(0));
    expect(mockSubmit).toBeCalled();
  });
});
