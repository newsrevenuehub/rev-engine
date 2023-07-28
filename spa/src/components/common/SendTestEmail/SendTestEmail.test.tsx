import userEvent from '@testing-library/user-event';
import Axios from 'ajax/axios';
import { SEND_TEST_EMAIL } from 'ajax/endpoints';
import MockAdapter from 'axios-mock-adapter';
import { axe } from 'jest-axe';
import { useAlert } from 'react-alert';
import { render, screen, waitFor } from 'test-utils';
import SendTestEmail from './SendTestEmail';

jest.mock('hooks/useUser');
jest.mock('react-alert', () => ({
  ...jest.requireActual('react-alert'),
  useAlert: jest.fn()
}));

const rpId = 1;

function tree() {
  return render(<SendTestEmail rpId={rpId} description="mock-description" />);
}

describe('SendTestEmail', () => {
  const useAlertMock = jest.mocked(useAlert);
  const axiosMock = new MockAdapter(Axios);

  beforeEach(() => {
    useAlertMock.mockReturnValue({ info: jest.fn(), error: jest.fn() } as any);
  });

  afterEach(() => axiosMock.reset());

  afterAll(() => axiosMock.restore());

  it('should render texts', () => {
    tree();
    expect(screen.getByText('Emails')).toBeInTheDocument();
    expect(screen.getByText('Preview sample emails')).toBeInTheDocument();
    expect(screen.getByText('mock-description')).toBeVisible();
  });

  it.each(['Send Receipt', 'Send Reminder', 'Send Magic link'])('should render %s button', (name) => {
    tree();
    expect(screen.getByRole('button', { name })).toBeEnabled();
  });

  it.each([
    ['Send Receipt', 'receipt'],
    ['Send Reminder', 'reminder'],
    ['Send Magic link', 'magic_link']
  ])('should POST to "/send-test-email/" if %s button is clicked', async (name, email_name) => {
    axiosMock.onPost(SEND_TEST_EMAIL).reply(200);
    tree();
    userEvent.click(screen.getByRole('button', { name }));
    await waitFor(() => expect(axiosMock.history.post).toHaveLength(1));
    expect(axiosMock.history.post[0]).toEqual(
      expect.objectContaining({
        data: JSON.stringify({
          email_name,
          revenue_program: rpId
        }),
        url: SEND_TEST_EMAIL
      })
    );
  });

  it('should show success notification is POST completes', async () => {
    const info = jest.fn();
    const error = jest.fn();
    useAlertMock.mockReturnValue({ info, error } as any);
    axiosMock.onPost(SEND_TEST_EMAIL).reply(200);
    tree();
    expect(info).not.toHaveBeenCalled();
    userEvent.click(screen.getByRole('button', { name: 'Send Receipt' }));

    await waitFor(() => expect(axiosMock.history.post).toHaveLength(1));
    expect(info).toHaveBeenCalledWith('Sending test email. Check your inbox.');
    expect(info).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(0);
  });

  it('should show error notification if POST fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const info = jest.fn();
    const error = jest.fn();
    useAlertMock.mockReturnValue({ info, error } as any);
    axiosMock.onPost().networkError();
    tree();
    expect(error).not.toHaveBeenCalled();
    userEvent.click(screen.getByRole('button', { name: 'Send Receipt' }));

    await waitFor(() => expect(axiosMock.history.post).toHaveLength(1));
    expect(error).toHaveBeenCalledWith('Error sending test email');
    expect(error).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledTimes(0);
    errorSpy.mockRestore();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
