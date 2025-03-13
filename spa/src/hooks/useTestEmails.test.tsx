import { renderHook } from '@testing-library/react-hooks';
import MockAdapter from 'axios-mock-adapter';
import Axios from 'ajax/axios';
import { TestQueryClientProvider } from 'test-utils';
import { useTestEmails } from './useTestEmails';
import { useSnackbar } from 'notistack';

jest.mock('notistack');

describe('useTestEmails', () => {
  let enqueueSnackbar: jest.SpyInstance;
  const useSnackbarMock = jest.mocked(useSnackbar);
  const axiosMock = new MockAdapter(Axios);

  beforeEach(() => {
    enqueueSnackbar = jest.fn();
    useSnackbarMock.mockReturnValue({ enqueueSnackbar } as any);
  });

  afterEach(() => axiosMock.reset());

  afterAll(() => axiosMock.restore());

  describe('sendTestEmail', () => {
    it('POSTS to /send-test-email/ with the revenue program ID and email name passed', async () => {
      axiosMock.onPost('/send-test-email/').reply(200);

      const { result, waitFor } = renderHook(useTestEmails, { wrapper: TestQueryClientProvider });

      result.current.sendTestEmail({ emailName: 'magic_link', revenueProgramId: 123 });
      await waitFor(() => expect(axiosMock.history.post).toHaveLength(1));
      expect(axiosMock.history.post[0].data).toEqual(
        JSON.stringify({ email_name: 'magic_link', revenue_program: 123 })
      );
    });

    it('shows a success notification if the POST succeeds', async () => {
      const { result, waitFor } = renderHook(useTestEmails, { wrapper: TestQueryClientProvider });

      axiosMock.onPost('/send-test-email/').reply(200);
      expect(enqueueSnackbar).not.toHaveBeenCalled();
      result.current.sendTestEmail({ emailName: 'magic_link', revenueProgramId: 123 });
      await waitFor(() => expect(axiosMock.history.post).toHaveLength(1));
      expect(enqueueSnackbar.mock.calls).toEqual([
        [
          'A test email has been sent. Please allow several minutes for the email to arrive.',
          expect.objectContaining({
            persist: true
          })
        ]
      ]);
    });

    it('shows an error notification if the POST fails', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { result, waitFor } = renderHook(useTestEmails, { wrapper: TestQueryClientProvider });

      axiosMock.onPost('/send-test-email/').networkError();
      expect(enqueueSnackbar).not.toHaveBeenCalled();
      result.current.sendTestEmail({ emailName: 'magic_link', revenueProgramId: 123 });
      await waitFor(() => expect(axiosMock.history.post).toHaveLength(1));
      expect(enqueueSnackbar.mock.calls).toEqual([
        [
          "There's been a problem sending the test email. Please try again.",
          expect.objectContaining({
            persist: true
          })
        ]
      ]);
      errorSpy.mockRestore();
    });
  });
});
