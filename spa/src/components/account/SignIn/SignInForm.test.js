import { render, screen, fireEvent, waitFor } from 'test-utils';
import SignInForm from './SignInForm';

import Input from 'elements/inputs/Input';

const mockSubmit = jest.fn((email, password) => {
  return Promise.resolve({ email, password });
});

describe('SignInForm Tests', () => {
  it('should not submit if email and password are blank', async () => {
    render(
      <div>
        <SignInForm onSubmitSignIn={mockSubmit} loading={false} />
      </div>
    );
    fireEvent.submit(screen.getByRole('button'));
    await waitFor(() => expect(screen.queryAllByRole('alert')).toHaveLength(0));
    expect(mockSubmit).not.toBeCalled();
  });

  it('should not submit if email is valid and password is blank', async () => {
    render(
      <div>
        <SignInForm onSubmitSignIn={mockSubmit} loading={false} />
      </div>
    );
    fireEvent.input(screen.queryByTestId(`signin-email`), {
      target: {
        value: 'test@test.com'
      }
    });
    fireEvent.submit(screen.getByRole('button'));
    expect(await screen.findAllByRole('error')).toHaveLength(1);
    expect(mockSubmit).not.toBeCalled();
  });

  it('should not submit if email is invalid and password is valid', async () => {
    render(
      <div>
        <SignInForm onSubmitSignIn={mockSubmit} loading={false} />
      </div>
    );
    fireEvent.input(screen.queryByTestId(`signin-pwd-${Input.types.PASSWORD}`), {
      target: {
        value: 'password'
      }
    });
    fireEvent.input(screen.queryByTestId(`signin-email`), {
      target: {
        value: 'test'
      }
    });
    fireEvent.submit(screen.getByRole('button'));
    expect(await screen.findAllByRole('error')).toHaveLength(1);
    expect(mockSubmit).not.toBeCalled();
  });

  it('should submit if email and password are valid', async () => {
    render(
      <div>
        <SignInForm onSubmitSignIn={mockSubmit} loading={false} />
      </div>
    );
    fireEvent.input(screen.queryByTestId(`signin-pwd-${Input.types.PASSWORD}`), {
      target: {
        value: 'password'
      }
    });
    fireEvent.input(screen.queryByTestId(`signin-email`), {
      target: {
        value: 'test@test.com'
      }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    await waitFor(() => expect(screen.queryAllByRole('alert')).toHaveLength(0));
    expect(mockSubmit).toBeCalled();
  });
});
