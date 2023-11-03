import { render, screen, fireEvent, waitFor } from 'test-utils';
import SignInForm from './SignInForm';

import Input from 'elements/inputs/Input';

const mockSubmit = jest.fn((email, password) => {
  return Promise.resolve({ email, password });
});

describe('SignInForm Tests', () => {
  function getScreen() {
    return render(
      <div>
        <SignInForm onSubmitSignIn={mockSubmit} loading={false} />
      </div>
    );
  }

  it('should have password toggle icon to show/hide value of password if visibility icon is clicked', () => {
    getScreen();
    const password = screen.getByTestId(`signin-pwd-${Input.types.PASSWORD}`);
    fireEvent.input(password, {
      target: {
        value: 'test@test.com'
      }
    });
    expect(password.getAttribute('type')).toEqual(Input.types.PASSWORD);
    const toggleIcon = screen.getByTestId('toggle-password');
    fireEvent.click(toggleIcon);
    expect(password.getAttribute('type')).toEqual(Input.types.TEXT);
    fireEvent.click(toggleIcon);
    expect(password.getAttribute('type')).toEqual(Input.types.PASSWORD);
  });

  it('should not submit if email and password are blank', async () => {
    getScreen();
    fireEvent.submit(screen.getByRole('button', { type: 'submit' }));
    await waitFor(() => expect(screen.queryAllByRole('alert')).toHaveLength(0));
    expect(mockSubmit).not.toBeCalled();
  });

  it('should not submit if email is valid and password is blank', async () => {
    getScreen();
    fireEvent.input(screen.getByTestId(`signin-email`), {
      target: {
        value: 'test@test.com'
      }
    });
    fireEvent.submit(screen.getByRole('button', { type: 'submit' }));
    expect(await screen.findAllByRole('error')).toHaveLength(1);
    expect(mockSubmit).not.toBeCalled();
  });

  it('should not submit if email is invalid and password is valid', async () => {
    getScreen();
    fireEvent.input(screen.getByTestId(`signin-pwd-${Input.types.PASSWORD}`), {
      target: {
        value: 'password'
      }
    });
    fireEvent.input(screen.getByTestId(`signin-email`), {
      target: {
        value: 'test'
      }
    });
    fireEvent.submit(screen.getByRole('button', { type: 'submit' }));
    expect(await screen.findAllByRole('error')).toHaveLength(1);
    expect(mockSubmit).not.toBeCalled();
  });

  it('should submit if email and password are valid', async () => {
    getScreen();
    fireEvent.input(screen.getByTestId(`signin-pwd-${Input.types.PASSWORD}`), {
      target: {
        value: 'password'
      }
    });
    fireEvent.input(screen.getByTestId(`signin-email`), {
      target: {
        value: 'test@test.com'
      }
    });

    fireEvent.submit(screen.getByRole('button', { type: 'submit' }));
    await waitFor(() => expect(screen.queryAllByRole('alert')).toHaveLength(0));
    expect(mockSubmit).toBeCalled();
  });
});
