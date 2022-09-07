import { render, screen, fireEvent, waitFor } from 'test-utils';
import ResetPasswordForm from './ResetPasswordForm';

import Input from 'elements/inputs/Input';

const mockSubmit = jest.fn((email, password) => {
  return Promise.resolve({ email, password });
});

describe('ResetPasswordForm Tests', () => {
  it('should not submit if both passwords are blank', async () => {
    render(
      <div>
        <ResetPasswordForm onResetPasswordSubmit={mockSubmit} loading={false} />
      </div>
    );
    fireEvent.submit(screen.getByRole('button'));
    await waitFor(() => expect(screen.queryAllByRole('error')).toHaveLength(0));
    expect(mockSubmit).not.toBeCalled();
  });

  it('should not submit if one password in blank and other is not blank', async () => {
    render(
      <div>
        <ResetPasswordForm onResetPasswordSubmit={mockSubmit} loading={false} />
      </div>
    );
    fireEvent.input(screen.queryByTestId(`reset-pwd-password`), {
      target: {
        value: 'password'
      }
    });
    fireEvent.submit(screen.getByRole('button'));
    await waitFor(() => expect(screen.queryAllByRole('error')).toHaveLength(0));
    expect(mockSubmit).not.toBeCalled();
  });

  it('should not submit if both passwords are valid and do not match', async () => {
    render(
      <div>
        <ResetPasswordForm onResetPasswordSubmit={mockSubmit} loading={false} />
      </div>
    );

    fireEvent.input(screen.queryByTestId(`reset-pwd-password`), {
      target: {
        value: 'password12#4'
      }
    });

    fireEvent.input(screen.queryByTestId(`reset-pwd1-password`), {
      target: {
        value: 'password23235'
      }
    });

    fireEvent.submit(screen.getByRole('button'));
    await waitFor(() => expect(screen.queryAllByRole('error')).toHaveLength(1));
    expect(mockSubmit).not.toBeCalled();
  });

  it('should not submit if both passwords are invalid and do match', async () => {
    render(
      <div>
        <ResetPasswordForm onResetPasswordSubmit={mockSubmit} loading={false} />
      </div>
    );

    fireEvent.input(screen.queryByTestId(`reset-pwd-password`), {
      target: {
        value: 'password'
      }
    });

    fireEvent.input(screen.queryByTestId(`reset-pwd1-password`), {
      target: {
        value: 'password'
      }
    });

    fireEvent.submit(screen.getByRole('button'));
    await waitFor(() => expect(screen.queryAllByRole('error')).toHaveLength(2));
    expect(mockSubmit).not.toBeCalled();
  });

  it('should submit if both passwords are valid and match', async () => {
    render(
      <div>
        <ResetPasswordForm onResetPasswordSubmit={mockSubmit} loading={false} />
      </div>
    );

    fireEvent.input(screen.queryByTestId(`reset-pwd-password`), {
      target: {
        value: 'password12#4'
      }
    });

    fireEvent.input(screen.queryByTestId(`reset-pwd1-password`), {
      target: {
        value: 'password12#4'
      }
    });

    fireEvent.submit(screen.getByRole('button'));
    await waitFor(() => expect(screen.queryAllByRole('error')).toHaveLength(0));
    expect(mockSubmit).toBeCalled();
  });
});
