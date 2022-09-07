import { render, screen, fireEvent, waitFor } from 'test-utils';
import ForgotPasswordForm from './ForgotPasswordForm';

import Input from 'elements/inputs/Input';

const mockSubmit = jest.fn((email, password) => {
  return Promise.resolve({ email, password });
});

describe('ForgotPasswordForm Tests', () => {
  it('should not submit if email is blank', async () => {
    render(
      <div>
        <ForgotPasswordForm onForgotPasswordSubmit={mockSubmit} loading={false} />
      </div>
    );
    fireEvent.submit(screen.getByRole('button'));
    await waitFor(() => expect(screen.queryAllByRole('error')).toHaveLength(0));
    expect(mockSubmit).not.toBeCalled();
  });

  it('should not submit if email is invalid', async () => {
    render(
      <div>
        <ForgotPasswordForm onForgotPasswordSubmit={mockSubmit} loading={false} />
      </div>
    );
    fireEvent.input(screen.queryByTestId(`forgotpwd-email`), {
      target: {
        value: 'test'
      }
    });
    fireEvent.submit(screen.getByRole('button'));
    expect(await screen.findAllByRole('error')).toHaveLength(1);
    expect(mockSubmit).not.toBeCalled();
  });

  it('should submit if email is valid', async () => {
    render(
      <div>
        <ForgotPasswordForm onForgotPasswordSubmit={mockSubmit} loading={false} />
      </div>
    );

    fireEvent.input(screen.queryByTestId(`forgotpwd-email`), {
      target: {
        value: 'test@test.com'
      }
    });

    fireEvent.submit(screen.getByRole('button'));
    await waitFor(() => expect(screen.queryAllByRole('error')).toHaveLength(0));
    expect(mockSubmit).toBeCalled();
  });
});
