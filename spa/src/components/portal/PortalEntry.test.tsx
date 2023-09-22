import userEvent from '@testing-library/user-event';
import Axios from 'ajax/axios';
import { LIVE_PAGE_DETAIL } from 'ajax/endpoints';
import MockAdapter from 'axios-mock-adapter';
import usePortal from 'hooks/usePortal';
import { render, screen, waitFor } from 'test-utils';
import PortalEntry from './PortalEntry';

jest.mock('hooks/usePortal');
jest.mock('components/analytics');

const usePortalMock = jest.mocked(usePortal);

const page = {
  revenue_program: { name: 'Test Portal' }
};

describe('PortalEntry', () => {
  const axiosMock = new MockAdapter(Axios);

  beforeEach(() => {
    usePortalMock.mockReturnValue({ page: undefined, sendMagicLink: jest.fn() } as any);
    axiosMock.onGet(LIVE_PAGE_DETAIL).reply(200, page);
  });

  afterEach(() => axiosMock.reset());

  afterAll(() => axiosMock.restore());

  function tree() {
    return render(<PortalEntry />);
  }

  it('should have expected default appearance and initial state', async () => {
    tree();

    // await screen.findByRole('heading', { name: /Welcome to the Test Portal Contributor Portal/i });
    expect(screen.getByRole('heading', { name: /Welcome to the RevEngine Contributor Portal/i })).toBeVisible();

    expect(
      screen.getByText(
        /Thank you for supporting our community. To access your contributions, enter the email used for contributions below and we’ll send you an email with a magic link./i,
        { exact: false }
      )
    ).toBeVisible();
    expect(screen.getByText('Email Address')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('value', '');
    expect(screen.getByRole('button', { name: 'Send Magic Link' })).toBeDisabled();
  });

  it('should have custom portal name', () => {
    usePortalMock.mockReturnValue({ page } as any);
    tree();
    const title = screen.getByRole('heading', {
      name: /Welcome to the Test Portal Contributor Portal/i
    });
    expect(title).toBeVisible();
  });

  it('should show success message when magicLinkIsSuccess = true', () => {
    usePortalMock.mockReturnValue({ magicLinkIsSuccess: true } as any);
    tree();

    expect(screen.getByText(/Email Sent!/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /An email has been sent to you containing your magic link. Click on your magic link to view your contributions./i
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/(It's safe to close this tab)/i)).toBeInTheDocument();
  });

  it('should call "sendMagicLink" with typed input', async () => {
    const sendMagicLink = jest.fn();
    usePortalMock.mockReturnValue({ sendMagicLink } as any);
    tree();
    const email = 'test@gmail.com';
    userEvent.type(screen.getByLabelText('Email Address'), email);

    expect(sendMagicLink).not.toHaveBeenCalled();

    userEvent.click(screen.getByRole('button', { name: 'Send Magic Link' }));

    await waitFor(() => expect(sendMagicLink).toHaveBeenCalledTimes(1));
    expect(sendMagicLink).toHaveBeenCalledWith({ email });
  });

  it('should show "magicLinkError" email error', async () => {
    usePortalMock.mockReturnValue({ magicLinkError: { email: ['mock-email-error'] } } as any);
    tree();
    expect(screen.getByText(/mock-email-error/i)).toBeInTheDocument();
  });
});
