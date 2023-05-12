import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { render, screen } from 'test-utils';
import ContributorEntry from './ContributorEntry';
import Axios from 'ajax/axios';
import { GET_MAGIC_LINK } from 'ajax/endpoints';

const page = {
  revenue_program: { name: 'Test Portal' }
};

describe('ContributorEntry', () => {
  const axiosMock = new MockAdapter(Axios);

  afterEach(() => axiosMock.reset());

  afterAll(() => axiosMock.restore());

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
    render(<ContributorEntry page={page as any} />);
    const title = screen.getByRole('heading', {
      name: `Welcome to the ${page.revenue_program.name} contributor portal`
    });
    expect(title).toBeVisible();
  });

  it('should show success message when response is 200', async () => {
    axiosMock.onPost(GET_MAGIC_LINK).reply(200);
    render(<ContributorEntry />);
    const input = screen.getByRole('textbox');
    const email = 'test@gmail.com';
    userEvent.type(input, email);
    expect(input).toHaveAttribute('value', email);

    const magicLinkButton = screen.getByRole('button', { name: 'Send Magic Link' });
    userEvent.click(magicLinkButton);

    const successMessage = await screen.findByText(/email has been sent to you containing your magic link/i);
    expect(successMessage).toBeInTheDocument();
  });

  it('should show "too many attempts" email error if failed response data has status code 429', async () => {
    axiosMock.onPost(GET_MAGIC_LINK).reply(429);
    render(<ContributorEntry />);
    const magicLinkButton = screen.getByRole('button', { name: 'Send Magic Link' });
    userEvent.click(magicLinkButton);

    const emailError = await screen.findByText(/too many attempts/i);
    expect(emailError).toBeInTheDocument();
  });

  it('should show email error if failed response data object contains email key', async () => {
    const emailErrorMessage = 'Enter a valid email address';

    axiosMock.onPost(GET_MAGIC_LINK).reply(500, { email: [emailErrorMessage] });
    render(<ContributorEntry />);
    const magicLinkButton = screen.getByRole('button', { name: 'Send Magic Link' });
    userEvent.click(magicLinkButton);

    const emailError = await screen.findByText(emailErrorMessage);
    expect(emailError).toBeInTheDocument();
  });

  it('should open alert if generic error (with no email in error response)', async () => {
    axiosMock.onPost(GET_MAGIC_LINK).reply(500);
    render(<ContributorEntry />);
    const magicLinkButton = screen.getByRole('button', { name: 'Send Magic Link' });
    userEvent.click(magicLinkButton);

    const emailError = await screen.findByText(/we encountered an issue and have been notified/i);
    expect(emailError).toBeInTheDocument();
  });
});
