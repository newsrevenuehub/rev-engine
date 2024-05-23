import { render, screen, waitFor } from 'test-utils';
import MockAdapter from 'axios-mock-adapter';
import Axios from 'ajax/axios';
import ResetPassword from '.';
import { SIGN_IN } from 'routes';
import { RESET_PASSWORD_SUCCESS_TEXT } from 'constants/textConstants';

jest.mock('./ResetPasswordForm');

describe('ForgotPassword Tests', () => {
  const axiosMock = new MockAdapter(Axios);

  beforeEach(() => {
    axiosMock.onPost('users/password_reset/confirm/').reply(200);
  });

  afterEach(() => axiosMock.reset());
  afterAll(() => axiosMock.restore());

  it('should call the reset password endpoint', async () => {
    render(<ResetPassword />);

    expect(axiosMock.history.post.length).toBe(0);
    expect(screen.queryByText(RESET_PASSWORD_SUCCESS_TEXT)).not.toBeInTheDocument();

    await screen.getByRole('button', { name: 'Reset Password' }).click();

    await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
    expect(axiosMock.history.post[0].data).toBe('{"token":null,"password":"mock-password"}');
    expect(screen.getByText(RESET_PASSWORD_SUCCESS_TEXT)).toBeInTheDocument();
  });

  describe('when submitting returns an error', () => {
    it('should pass validation errors to the form', async () => {
      axiosMock.onPost('users/password_reset/confirm/').reply(400, { password: ['mock-error'] });
      render(<ResetPassword />);

      expect(axiosMock.history.post.length).toBe(0);

      await screen.getByRole('button', { name: 'Reset Password' }).click();

      await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
      expect(screen.getByTestId('reset-password-form').dataset.error).toBe('mock-error');
    });

    it('should not pass non-validation errors to the form', async () => {
      axiosMock.onPost('users/password_reset/confirm/').reply(500);
      render(<ResetPassword />);

      expect(axiosMock.history.post.length).toBe(0);

      await screen.getByRole('button', { name: 'Reset Password' }).click();

      await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
      expect(screen.getByTestId('reset-password-form').dataset.error).toBeUndefined();
    });

    it('should show non-validation error messages', async () => {
      axiosMock.onPost('users/password_reset/confirm/').reply(500, { detail: 'mock-non-validation-error' });
      render(<ResetPassword />);

      expect(axiosMock.history.post.length).toBe(0);

      screen.getByRole('button', { name: 'Reset Password' }).click();

      await screen.findByText('mock-non-validation-error');
    });
  });

  it('should show the right revengine logo', () => {
    render(<ResetPassword />);
    const bottomYellowBar = screen.getByTestId('logo2');
    expect(bottomYellowBar).toBeInTheDocument();
  });

  it('should have yellow left bar and purple bottom bar', () => {
    render(<ResetPassword />);
    const bottomYellowBar = screen.getByTestId('bottom-yellow-png');
    expect(bottomYellowBar).toBeInTheDocument();
    const leftPanel = screen.getByTestId('left');
    expect(leftPanel).toBeInTheDocument();
  });

  it('should have heading - Reset Password', () => {
    render(<ResetPassword />);
    const title = screen.getByTestId('reset-pwd-title');
    expect(title).toBeInTheDocument();
  });

  it('should have advantages and company icons', () => {
    render(<ResetPassword />);
    const advantages = screen.getByTestId('advantages');
    expect(advantages).toBeInTheDocument();
    const icons = screen.getByTestId('company-icons');
    expect(icons).toBeInTheDocument();
  });

  it('should have ResetPassword Form', () => {
    render(<ResetPassword />);
    expect(screen.getByRole('button', { name: 'Reset Password' })).toBeInTheDocument();
  });

  it('should have link to take user to sign in page', () => {
    render(<ResetPassword />);
    expect(screen.getByRole('link')).toHaveAttribute('href', SIGN_IN);
  });
});
