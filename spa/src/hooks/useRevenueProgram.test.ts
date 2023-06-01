import { renderHook } from '@testing-library/react-hooks';
import Axios from 'ajax/axios';
import { REVENUE_PROGRAMS } from 'ajax/endpoints';
import MockAdapter from 'axios-mock-adapter';
import { useAlert } from 'react-alert';
import { TestQueryClientProvider } from 'test-utils';
import useRevenueProgram from './useRevenueProgram';
import useUser from './useUser';

jest.mock('react-alert');
jest.mock('hooks/useUser');

const rpId = 1;

// eslint-disable-next-line react-hooks/rules-of-hooks
const testHook = () => useRevenueProgram(rpId);

describe('useRevenueProgram', () => {
  const useUserMock = jest.mocked(useUser);
  const axiosMock = new MockAdapter(Axios);
  const useAlertMock = useAlert as jest.Mock;

  beforeEach(() => {
    axiosMock.onPatch(`${REVENUE_PROGRAMS}${rpId}/`).reply(200);
    useAlertMock.mockReturnValue({ error: jest.fn(), success: jest.fn() });
    useUserMock.mockReturnValue({
      isError: false,
      isLoading: false,
      refetch: jest.fn(),
      setRefetchInterval: jest.fn()
    });
  });
  afterEach(() => axiosMock.reset());
  afterAll(() => axiosMock.restore());

  describe('The updateRevenueProgram function', () => {
    it('returns updateRevenueProgram function', async () => {
      const { result } = renderHook(testHook, { wrapper: TestQueryClientProvider });

      expect(typeof result.current.updateRevenueProgram).toBe('function');
    });

    it('makes a PATCH request to revenue program', async () => {
      const { result, waitForNextUpdate } = renderHook(testHook, { wrapper: TestQueryClientProvider });

      expect(axiosMock.history.patch.length).toBe(0);
      await result.current.updateRevenueProgram({ mailchimp_email_list: { id: '0', name: 'mock-list' } });
      await waitForNextUpdate();
      expect(axiosMock.history.patch.length).toBe(1);
      expect(axiosMock.history.patch[0].url).toBe(`${REVENUE_PROGRAMS}${rpId}/`);
      expect(axiosMock.history.patch[0].data).toBe(
        JSON.stringify({ mailchimp_email_list: { id: '0', name: 'mock-list' } })
      );
    });

    describe('If the PATCH fails', () => {
      let errorSpy: jest.SpyInstance;

      beforeEach(() => {
        axiosMock.onPatch(`${REVENUE_PROGRAMS}${rpId}/`).networkError();
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      });

      afterEach(() => errorSpy.mockRestore());

      it('logs the error to the console', async () => {
        const { result } = renderHook(testHook, { wrapper: TestQueryClientProvider });

        expect(errorSpy).not.toBeCalled();

        try {
          await result.current.updateRevenueProgram({ mailchimp_email_list: { id: '0', name: 'mock-list' } });
        } catch {}

        expect(errorSpy).toBeCalledTimes(2); // Axios also logs an error
      });

      it('displays an error alert to the user', async () => {
        const error = jest.fn();
        useAlertMock.mockReturnValue({ error });

        const { result } = renderHook(testHook, { wrapper: TestQueryClientProvider });

        expect(error).not.toBeCalled();

        try {
          await result.current.updateRevenueProgram({ mailchimp_email_list: { id: '0', name: 'mock-list' } });
        } catch {}

        expect(error).toBeCalledTimes(1);
      });
    });
  });
});
