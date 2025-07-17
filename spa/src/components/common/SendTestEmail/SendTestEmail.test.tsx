import userEvent from '@testing-library/user-event';
import Axios from 'ajax/axios';
import { SEND_TEST_EMAIL } from 'ajax/endpoints';
import MockAdapter from 'axios-mock-adapter';
import { axe } from 'jest-axe';
import { useSnackbar } from 'notistack';

import { render, screen, waitFor } from 'test-utils';
import SendTestEmail from './SendTestEmail';

jest.mock('hooks/useUser');
jest.mock('notistack', () => ({
  ...jest.requireActual('notistack'),
  useSnackbar: jest.fn()
}));

const rpId = 1;

function tree({ editable = true } = {}) {
  return render(<SendTestEmail rpId={rpId} description="mock-description" editable={editable} />);
}

describe('SendTestEmail', () => {
  const useSnackbarMock = jest.mocked(useSnackbar);
  const enqueueSnackbar = jest.fn();
  const axiosMock = new MockAdapter(Axios);

  beforeEach(() => {
    useSnackbarMock.mockReturnValue({ enqueueSnackbar } as any);
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

  describe.each([
    ['Send Receipt', 'receipt'],
    ['Send Reminder', 'reminder'],
    ['Send Magic link', 'magic_link']
  ])('%s', (name, email_name) => {
    it(`should POST to "/send-test-email/" if ${name} button is clicked`, async () => {
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
      axiosMock.onPost(SEND_TEST_EMAIL).reply(200);
      tree();
      expect(enqueueSnackbar).not.toHaveBeenCalled();
      userEvent.click(screen.getByRole('button', { name }));

      await waitFor(() => expect(axiosMock.history.post).toHaveLength(1));
      expect(enqueueSnackbar).toHaveBeenCalledWith(
        'Sending test email. Please check your inbox.',
        expect.objectContaining({
          persist: true
        })
      );
      expect(enqueueSnackbar).toHaveBeenCalledTimes(1);
    });

    it('should show error notification if POST fails', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      axiosMock.onPost().networkError();
      tree();
      expect(enqueueSnackbar).not.toHaveBeenCalled();
      userEvent.click(screen.getByRole('button', { name }));

      await waitFor(() => expect(axiosMock.history.post).toHaveLength(1));
      expect(enqueueSnackbar).toHaveBeenCalledWith(
        'There’s been a problem sending test email. Please try again.',
        expect.objectContaining({
          persist: true
        })
      );
      expect(enqueueSnackbar).toHaveBeenCalledTimes(1);
      errorSpy.mockRestore();
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });

  it('should disable buttons if editable is false', () => {
    tree({ editable: false });
    expect(screen.getByRole('button', { name: 'Send Receipt' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send Reminder' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send Magic link' })).toBeDisabled();
  });
});
