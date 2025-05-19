import { useQueryClient } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-hooks';
import Axios from 'ajax/portal-axios';
import MockAdapter from 'axios-mock-adapter';
import { useSnackbar } from 'notistack';
import { useHistory } from 'react-router-dom';
import { TestQueryClientProvider } from 'test-utils';
import { usePortalContribution } from './usePortalContribution';

jest.mock('react-router-dom', () => ({
  useHistory: jest.fn()
}));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: jest.fn()
}));

jest.mock('notistack', () => ({
  ...jest.requireActual('notistack'),
  useSnackbar: jest.fn()
}));

const mockContributionResponse = {
  amount: 123,
  card_brand: 'amex',
  card_expiration_date: 'mock-cc-expiration-1',
  card_last_4: '1234',
  created: 'mock-created-1',
  id: 1,
  interval: 'month',
  is_cancelable: true,
  is_modifiable: true,
  last_payment_date: 'mock-last-payment-1',
  next_payment_date: '',
  payment_type: 'mock-payment-type-1',
  revenue_program: 1,
  status: 'paid',
  transaction_time: 'mock-transaction-time-1'
};

function hook(contributorId: number, contributionId: number) {
  return renderHook(() => usePortalContribution(contributorId, contributionId), {
    wrapper: TestQueryClientProvider
  });
}

describe('usePortalContribution', () => {
  const useHistoryMock = jest.mocked(useHistory);
  const useQueryClientMock = useQueryClient as jest.Mock;
  const useSnackbarMock = useSnackbar as jest.Mock;
  const axiosMock = new MockAdapter(Axios);
  let enqueueSnackbar: jest.Mock;
  const push = jest.fn();

  beforeEach(() => {
    useHistoryMock.mockReturnValue({ push });
    axiosMock.onGet('contributors/123/contributions/1/').reply(200, mockContributionResponse);
    axiosMock.onPatch('contributors/123/contributions/1/').reply(200);
    axiosMock.onPost('contributors/123/contributions/1/send-receipt/').reply(204);
    enqueueSnackbar = jest.fn();
    useSnackbarMock.mockReturnValue({ enqueueSnackbar } as any);
    useQueryClientMock.mockReturnValue({
      invalidateQueries: jest.fn()
    });
  });

  afterEach(() => axiosMock.reset());
  afterAll(() => axiosMock.restore());

  describe('While fetching the contribution', () => {
    // These wait for the next update to allow component updates to happen after
    // the fetch completes.

    it('returns a loading status', async () => {
      const { result, waitForNextUpdate } = hook(123, 1);

      expect(result.current.isFetching).toBe(true);
      expect(result.current.isLoading).toBe(true);
      await waitForNextUpdate();
    });

    it('returns undefined data', async () => {
      const { result, waitForNextUpdate } = hook(123, 1);

      expect(result.current.contribution).toBeUndefined();
      await waitForNextUpdate();
    });
  });

  it('returns the contribution and appropriate status after fetching', async () => {
    const { result, waitFor } = hook(123, 1);

    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    expect(result.current.contribution).toEqual(mockContributionResponse);
    expect(axiosMock.history.get[0].url).toBe('/contributors/123/contributions/1/');
  });

  describe('When fetching the contribution fails', () => {
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
      axiosMock.onGet('contributors/123/contributions/1/').networkError();
      errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => errorSpy.mockRestore());

    it('returns an error status', async () => {
      const { result, waitFor } = hook(123, 1);

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      expect(result.current.isError).toBe(true);
    });

    it('returns an undefined contribution', async () => {
      const { result, waitFor } = hook(123, 1);

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      expect(result.current.contribution).toBeUndefined();
    });
  });

  describe('The cancelContribution function', () => {
    let errorSpy: jest.SpyInstance;
    const invalidateQueries = jest.fn();

    beforeEach(() => {
      errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      useQueryClientMock.mockReturnValue({
        invalidateQueries
      });
      axiosMock.onDelete('contributors/123/contributions/1/').reply(200);
    });

    afterEach(() => errorSpy.mockRestore());

    it('calls the cancel endpoint', async () => {
      const { result, waitFor } = hook(123, 1);

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));

      expect(axiosMock.history.delete.length).toBe(0);
      await result.current.cancelContribution();
      await waitFor(() => expect(axiosMock.history.delete.length).toBe(1));
      expect(axiosMock.history.delete[0].url).toBe('/contributors/123/contributions/1/');
    });

    it('shows a success notification if cancel succeeds', async () => {
      const { result, waitFor } = hook(123, 1);

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));

      expect(enqueueSnackbar).not.toHaveBeenCalled();
      await result.current.cancelContribution();
      await waitFor(() => expect(axiosMock.history.delete.length).toBe(1));

      expect(enqueueSnackbar).toHaveBeenCalledWith(
        'Your contribution has been successfully canceled.',
        expect.objectContaining({ persist: true })
      );
    });

    it('shows the default error notification if cancel fails', async () => {
      axiosMock.onDelete('contributors/123/contributions/1/').networkError();

      const { result, waitFor } = hook(123, 1);

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));

      expect(enqueueSnackbar).not.toHaveBeenCalled();
      try {
        await result.current.cancelContribution();
      } catch {}

      await waitFor(() => expect(axiosMock.history.delete.length).toBe(1));

      await waitFor(() =>
        expect(enqueueSnackbar).toHaveBeenCalledWith(
          'Something went wrong. Please, try again later.',
          expect.objectContaining({ persist: true })
        )
      );
    });

    it('shows the custom error message notification if cancel fails', async () => {
      axiosMock.onDelete('contributors/123/contributions/1/').reply(400, {
        detail: 'custom error message'
      });

      const { result, waitFor } = hook(123, 1);

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));

      expect(enqueueSnackbar).not.toHaveBeenCalled();
      try {
        await result.current.cancelContribution();
      } catch {}

      await waitFor(() => expect(axiosMock.history.delete.length).toBe(1));

      await waitFor(() =>
        expect(enqueueSnackbar).toHaveBeenCalledWith('custom error message', expect.objectContaining({ persist: true }))
      );
    });

    it('invalidates the contribution list and detail query', async () => {
      const { result, waitFor } = hook(123, 1);

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      expect(invalidateQueries).not.toHaveBeenCalled();
      jest.useFakeTimers();
      await result.current.cancelContribution();
      await waitFor(() => expect(axiosMock.history.delete.length).toBe(1));
      expect(invalidateQueries).toHaveBeenCalledWith(['portalContribution', 123, 1]);
      expect(invalidateQueries).toHaveBeenCalledTimes(1);
      act(() => {
        jest.runAllTimers();
      });
      await waitFor(() => expect(invalidateQueries).toHaveBeenCalledTimes(3));
      expect(invalidateQueries).toHaveBeenCalledWith(['portalContributionList']);
      expect(invalidateQueries).toHaveBeenLastCalledWith(['portalContribution', 123, 1]);
      jest.useRealTimers();
    });
  });

  describe('The updateContribution function', () => {
    // These wait for the next update to allow component updates to happen after
    // the fetch completes.

    it('is returned even when a contribution is loading', async () => {
      const { result, waitForNextUpdate } = hook(123, 1);

      expect(typeof result.current.updateContribution).toBe('function');
      await waitForNextUpdate();
    });

    it.each([
      [{ provider_payment_method_id: 'new-id' }, 'paymentMethod'],
      [{ amount: 123 }, 'billingDetails']
    ] as const)('makes a PATCH to /api/v1/contributions/ with %s', async (data, type) => {
      const { result, waitFor } = hook(123, 1);

      result.current.updateContribution(data, type);
      await waitFor(() => expect(axiosMock.history.patch.length).toBe(1));
      expect(axiosMock.history.patch[0]).toEqual(
        expect.objectContaining({
          data: JSON.stringify(data),
          url: '/contributors/123/contributions/1/'
        })
      );
    });

    it('invalidates the contribution list and detail query after 15s', async () => {
      const invalidateQueries = jest.fn();
      useQueryClientMock.mockReturnValue({
        invalidateQueries
      });
      const { result, waitFor } = hook(123, 1);

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      expect(invalidateQueries).not.toHaveBeenCalled();
      jest.useFakeTimers();
      await result.current.updateContribution({ provider_payment_method_id: 'new-id' }, 'paymentMethod');
      await waitFor(() => expect(axiosMock.history.patch.length).toBe(1));

      expect(invalidateQueries).toHaveBeenCalledWith(['portalContribution', 123, 1]);
      expect(invalidateQueries).toHaveBeenCalledTimes(1);
      act(() => {
        jest.runAllTimers();
      });
      await waitFor(() => expect(invalidateQueries).toHaveBeenCalledTimes(3));
      expect(invalidateQueries).toHaveBeenCalledWith(['portalContributionList']);
      expect(invalidateQueries).toHaveBeenLastCalledWith(['portalContribution', 123, 1]);
      jest.useRealTimers();
    });

    it.each([
      ['paymentMethod', 'Payment method has successfully been updated.'],
      [
        'billingDetails',
        'Your billing details have been successfully updated. Changes may not be reflected in portal immediately.'
      ]
    ] as const)(
      'resolves with the request and shows a notification if the PATCH succeeds, type: %s',
      async (type, message) => {
        const { result } = hook(123, 1);

        expect(await result.current.updateContribution({}, type)).not.toBe(undefined);
        expect(enqueueSnackbar.mock.calls).toEqual([[message, expect.objectContaining({ persist: true })]]);
      }
    );

    describe.each([
      ['paymentMethod', { provider_payment_method_id: 'new-id' }],
      ['billingDetails', { amount: 123 }]
    ] as const)('When updating %s fails', (updateType, updateData) => {
      it('rejects with a generic error notification if the PATCH fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { result } = hook(123, 1);

        axiosMock.onPatch('contributors/123/contributions/1/').networkError();
        await expect(result.current.updateContribution(updateData, updateType)).rejects.toThrow();
        expect(enqueueSnackbar.mock.calls).toEqual([
          ['Billing details failed to save changes. Please try again.', expect.objectContaining({ persist: true })]
        ]);
        errorSpy.mockRestore();
      });

      it('shows the first error message if one is returned', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { result } = hook(123, 1);

        axiosMock.onPatch('contributors/123/contributions/1/').reply(401, ['test-error']);
        await expect(result.current.updateContribution(updateData, updateType)).rejects.toThrow();
        expect(enqueueSnackbar.mock.calls).toEqual([
          ['Billing details failed to save changes. test-error', expect.objectContaining({ persist: true })]
        ]);
        errorSpy.mockRestore();
      });
    });
  });

  describe('The sendEmailReceipt function', () => {
    it('makes a POST to /api/v1/contributions/{id}/send-receipt/', async () => {
      const { result, waitFor } = hook(123, 1);

      expect(axiosMock.history.post.length).toBe(0);

      result.current.sendEmailReceipt();
      await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
      expect(axiosMock.history.post[0].url).toBe('/contributors/123/contributions/1/send-receipt/');
    });

    it('resolves with the request and shows a notification if the POST succeeds', async () => {
      const { result } = hook(123, 1);

      expect(await result.current.sendEmailReceipt()).not.toBe(undefined);
      expect(enqueueSnackbar.mock.calls).toEqual([
        ['Your receipt has been sent to your email.', expect.objectContaining({ persist: true })]
      ]);
    });

    it('rejects and shows an error notification if the POST fails', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = hook(123, 1);

      axiosMock.onPost('contributors/123/contributions/1/send-receipt/').networkError();
      await expect(result.current.sendEmailReceipt()).rejects.toThrow();
      expect(enqueueSnackbar.mock.calls).toEqual([
        [
          'Your receipt has failed to send to your email. Please wait and try again.',
          expect.objectContaining({ persist: true })
        ]
      ]);
      errorSpy.mockRestore();
    });
  });
});
