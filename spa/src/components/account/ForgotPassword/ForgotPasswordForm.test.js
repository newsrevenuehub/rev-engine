import { render, screen, fireEvent, waitFor } from 'test-utils';
import ForgotPasswordForm from './ForgotPasswordForm';

import Input from 'elements/inputs/Input';

const mockSubmit = jest.fn((email, password) => {
  return Promise.resolve({ email, password });
});

describe('ForgotPasswordForm Tests', () => {
  function getScreen() {
    return render(
      <div>
        <ForgotPasswordForm onForgotPasswordSubmit={mockSubmit} loading={false} />
      </div>
    );
  }

  it('should not submit if email is blank', async () => {
    getScreen();
    fireEvent.submit(screen.getByRole('button', { type: 'submit' }));
    await waitFor(() => expect(screen.queryAllByRole('error')).toHaveLength(0));
    expect(mockSubmit).not.toBeCalled();
  });

  it('should not submit if email is invalid', async () => {
    getScreen();
    fireEvent.input(screen.queryByTestId(`forgotpwd-email`), {
      target: {
        value: 'test'
      }
    });
    fireEvent.submit(screen.getByRole('button', { type: 'submit' }));
    expect(await screen.findAllByRole('error')).toHaveLength(1);
    expect(mockSubmit).not.toBeCalled();
  });

  it('should submit if email is valid', async () => {
    getScreen();
    fireEvent.input(screen.queryByTestId(`forgotpwd-email`), {
      target: {
        value: 'test@test.com'
      }
    });

    fireEvent.submit(screen.getByRole('button', { type: 'submit' }));
    await waitFor(() => expect(screen.queryAllByRole('error')).toHaveLength(0));
    expect(mockSubmit).toBeCalled();
  });
});
