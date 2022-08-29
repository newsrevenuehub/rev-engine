import { render, screen, fireEvent } from 'test-utils';
import userEvent from '@testing-library/user-event';
import ContributorEntry from './ContributorEntry';
import { revengineApi, server, rest } from 'test-server';
import { GET_MAGIC_LINK } from 'ajax/endpoints';

const page = {
  revenue_program: { name: 'Test Portal' }
};

describe('ContributorEntry', () => {
  it('should have expected default appearance and initial state', () => {
    render(<ContributorEntry />);
    const title = screen.getByRole('heading', { name: 'Welcome to the RevEngine contributor portal' });
    expect(title).toBeVisible();

    const label = screen.getByText('Enter the email address you used to make a contribution');
    expect(label).toBeInTheDocument();

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('value', '');

    const magicLinkButton = screen.getByRole('button', { name: 'Send Magic Link' });
    expect(magicLinkButton).toBeEnabled();
  });

  it('should have custom portal name', () => {
    render(<ContributorEntry page={page} />);
    const title = screen.getByRole('heading', {
      name: `Welcome to the ${page.revenue_program.name} contributor portal`
    });
    expect(title).toBeVisible();
  });

  it('should show success message when response is 200', async () => {
    server.resetHandlers(rest.post(revengineApi(GET_MAGIC_LINK), (req, res, ctx) => res(ctx.status(200))));
    render(<ContributorEntry />);
    const input = screen.getByRole('textbox');
    const email = 'test@gmail.com';
    fireEvent.change(input, { target: { value: email } });
    expect(input).toHaveAttribute('value', email);

    const magicLinkButton = screen.getByRole('button', { name: 'Send Magic Link' });
    userEvent.click(magicLinkButton);

    const successMessage = await screen.findByText(/email has been sent to you containing your magic link/i);
    expect(successMessage).toBeInTheDocument();
  });

  it('should show "too many attempts" email error if failed response data has status code 429', async () => {
    server.resetHandlers(rest.post(revengineApi(GET_MAGIC_LINK), (req, res, ctx) => res(ctx.status(429))));
    render(<ContributorEntry />);
    const magicLinkButton = screen.getByRole('button', { name: 'Send Magic Link' });
    userEvent.click(magicLinkButton);

    const emailError = await screen.findByText(/too many attempts/i);
    expect(emailError).toBeInTheDocument();
  });

  it('should show email error if failed response data object contains email key', async () => {
    const emailErrorMessage = 'Enter a valid email address';
    server.resetHandlers(
      rest.post(revengineApi(GET_MAGIC_LINK), (req, res, ctx) =>
        res(
          // Status code doesn't matter as long as it's an error status
          ctx.status(500),
          ctx.json({
            email: [emailErrorMessage]
          })
        )
      )
    );
    render(<ContributorEntry />);
    const magicLinkButton = screen.getByRole('button', { name: 'Send Magic Link' });
    userEvent.click(magicLinkButton);

    const emailError = await screen.findByText(emailErrorMessage);
    expect(emailError).toBeInTheDocument();
  });

  it('should open alert if generic error (with no email in error response)', async () => {
    server.resetHandlers(
      // Status code doesn't matter as long as it's an error status
      rest.post(revengineApi(GET_MAGIC_LINK), (req, res, ctx) => res(ctx.status(500)))
    );
    render(<ContributorEntry />);
    const magicLinkButton = screen.getByRole('button', { name: 'Send Magic Link' });
    userEvent.click(magicLinkButton);

    const emailError = await screen.findByTestId('alert', { name: /we encountered an issue and have been notified/i });
    expect(emailError).toBeInTheDocument();
  });
});
