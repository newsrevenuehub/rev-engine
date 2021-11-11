import { render, screen, user, waitFor } from 'test-utils';
import { server, rest, revengineApi } from 'test-server';
import Login from './Login';

// Constants
import { PASSWORD_RESET_URL } from 'constants/authConstants';
import { TOKEN } from 'ajax/endpoints';

it('should render "message" prop', () => {
  const testMessage = 'My Test Message';
  render(<Login message={testMessage} />);

  const message = screen.getByText(testMessage);
  expect(message).toBeInTheDocument();
});

it('should render an input for email', () => {
  render(<Login />);

  const emailInput = screen.getByLabelText(/email/i);
  expect(emailInput).toBeInTheDocument();
  expect(emailInput).toHaveAttribute('type', 'email');
});

it('should render an input for password', () => {
  render(<Login />);

  const passwordInput = screen.getByLabelText(/password/i);
  expect(passwordInput).toBeInTheDocument();
  expect(passwordInput).toHaveAttribute('type', 'password');
});

it('should display "Sign in" button', () => {
  render(<Login />);

  const signInButton = screen.getByText(/sign in/i);
  expect(signInButton).toBeInTheDocument();
  expect(signInButton.type).toEqual('submit');
});

it('should display "Forgot password" link', () => {
  render(<Login />);

  const forgotPasswordLink = screen.getByText(/forgot password/i);
  expect(forgotPasswordLink).toBeInTheDocument();
  expect(forgotPasswordLink).toHaveAttribute('href', PASSWORD_RESET_URL);
});

jest.mock('components/authentication/util');
it('should fire "onSuccess" callback if auth is successfull', async () => {
  const onSuccessSpy = jest.fn();
  render(<Login onSuccess={onSuccessSpy} />);
  server.use(rest.post(revengineApi(TOKEN), (req, res, ctx) => res(ctx.json({ detail: 'success' }))));

  const emailInput = screen.getByLabelText(/email/i);
  const passwordInput = screen.getByLabelText(/password/i);
  const signInButton = screen.getByText(/sign in/i);
  user.type(emailInput, 'test@test.com');
  user.type(passwordInput, 'testpasword');
  user.click(signInButton);
  await waitFor(() => expect(onSuccessSpy).toBeCalledTimes(1), { interval: 100 });
});
