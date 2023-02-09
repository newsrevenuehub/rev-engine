import { renderHook } from '@testing-library/react-hooks';
import Axios from 'ajax/axios';
import MockAdapter from 'axios-mock-adapter';
import { useAlert } from 'react-alert';
import { TestQueryClientProvider } from 'test-utils';
import useContributorContributionList, {
  FetchContributorsContributionsResponse
} from './useContributorContributionList';

jest.mock('react-alert');

const mockGetResponse: FetchContributorsContributionsResponse = {
  count: 1,
  results: [
    {
      amount: 123,
      card_brand: 'amex',
      created: 'mock-created-1',
      credit_card_expiration_date: 'mock-cc-expiration-1',
      id: 'mock-id-1',
      interval: 'month',
      is_cancelable: true,
      is_modifiable: true,
      last4: 1234,
      last_payment_date: 'mock-last-payment-1',
      payment_type: 'mock-payment-type-1',
      provider_customer_id: 'mock-customer-1',
      revenue_program: 'mock-rp-1',
      status: 'paid',
      stripe_account_id: 'mock-account-1',
      subscription_id: 'mock-sub-id'
    },
    {
      amount: 456,
      card_brand: 'visa',
      created: 'mock-created-2',
      credit_card_expiration_date: 'mock-cc-expiration-2',
      id: 'mock-id-2',
      interval: 'one_time',
      is_cancelable: false,
      is_modifiable: false,
      last4: 5678,
      last_payment_date: 'mock-last-payment-2',
      payment_type: 'mock-payment-type-2',
      provider_customer_id: 'mock-customer-2',
      revenue_program: 'mock-rp-2',
      status: 'paid',
      stripe_account_id: 'mock-account-2'
    }
  ]
};

describe('useContributorContributionList', () => {
  const axiosMock = new MockAdapter(Axios);
  const useAlertMock = useAlert as jest.Mock;

  beforeEach(() => {
    axiosMock.onGet('contributions/').reply(200, mockGetResponse);
    useAlertMock.mockReturnValue({ error: jest.fn(), info: jest.fn() });
  });
  afterEach(() => axiosMock.reset());
  afterAll(() => axiosMock.restore());

  it('fetches contributions from contributions/ using query params provided', async () => {
    const { result, waitFor } = renderHook(
      () => useContributorContributionList({ page: 3, page_size: 99, rp: 'test-rp' }),
      {
        wrapper: TestQueryClientProvider
      }
    );

    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    expect(axiosMock.history.get[0]).toEqual(
      expect.objectContaining({
        url: 'contributions/',
        params: { ordering: expect.any(String), page: 3, page_size: 99, rp: 'test-rp' }
      })
    );
    expect(result.current.contributions).toEqual(mockGetResponse.results);
    expect(result.error).toBeUndefined();
  });

  it("sets the ordering query param to '-created,contributor_email' by default", async () => {
    const { waitFor } = renderHook(() => useContributorContributionList(), {
      wrapper: TestQueryClientProvider
    });

    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    expect(axiosMock.history.get[0].params.ordering).toBe('-created,contributor_email');
  });

  it('allows overriding the ordering query param', async () => {
    const { waitFor } = renderHook(() => useContributorContributionList({ ordering: 'test-ordering' }), {
      wrapper: TestQueryClientProvider
    });

    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    expect(axiosMock.history.get[0].params.ordering).toBe('test-ordering');
  });

  describe('While fetching contributions', () => {
    // These wait for the next update to allow component updates to happen after
    // the fetch completes.

    it('returns a loading status', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useContributorContributionList(), {
        wrapper: TestQueryClientProvider
      });

      expect(result.current.isFetching).toBe(true);
      expect(result.current.isLoading).toBe(true);
      await waitForNextUpdate();
    });

    it('returns an empty array of contributions', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useContributorContributionList(), {
        wrapper: TestQueryClientProvider
      });

      expect(result.current.contributions).toEqual([]);
      await waitForNextUpdate();
    });
  });

  describe('When fetching contributions fails', () => {
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
      axiosMock.onGet('contributions/').networkError();
      errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => errorSpy.mockRestore());

    it('returns an error status', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useContributorContributionList(), {
        wrapper: TestQueryClientProvider
      });

      await waitForNextUpdate();
      expect(result.current.isError).toBe(true);
    });

    it('returns an empty array of contributions', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useContributorContributionList(), {
        wrapper: TestQueryClientProvider
      });

      await waitForNextUpdate();
      expect(result.current.contributions).toEqual([]);
    });
  });

  it('refetches contributions using the same query params when the refetch function is called', async () => {
    const { result, waitFor } = renderHook(
      () => useContributorContributionList({ ordering: 'test-ordering', rp: 'test-rp-for-refetch' }),
      {
        wrapper: TestQueryClientProvider
      }
    );

    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    result.current.refetch();
    await waitFor(() => expect(axiosMock.history.get.length).toBe(2));
    expect(axiosMock.history.get[1]).toEqual(
      expect.objectContaining({
        url: 'contributions/',
        params: { ordering: 'test-ordering', rp: 'test-rp-for-refetch' }
      })
    );
  });

  describe('cancelRecurringContribution', () => {
    it('sends a DELETE request to /subscriptions', async () => {
      axiosMock.onDelete(`subscriptions/${mockGetResponse.results[0].subscription_id}/`).reply(204);

      const { result, waitForNextUpdate } = renderHook(() => useContributorContributionList(), {
        wrapper: TestQueryClientProvider
      });

      await waitForNextUpdate();
      expect(axiosMock.history.delete.length).toBe(0);
      await result.current.cancelRecurringContribution(result.current.contributions[0]);
      expect(axiosMock.history.delete.length).toBe(1);
      await waitForNextUpdate();
    });

    describe('If the DELETE request succeeds', () => {
      beforeEach(() => axiosMock.onDelete(`subscriptions/${mockGetResponse.results[0].subscription_id}/`).reply(204));

      it('displays an info alert to the user', async () => {
        const info = jest.fn();

        useAlertMock.mockReturnValue({ info });

        const { result, waitForNextUpdate } = renderHook(() => useContributorContributionList(), {
          wrapper: TestQueryClientProvider
        });

        await waitForNextUpdate();
        expect(info).not.toBeCalled();
        await result.current.cancelRecurringContribution(result.current.contributions[0]);
        expect(info).toBeCalledTimes(1);
        await waitForNextUpdate();
      });

      it('removes the contribution from the list', async () => {
        const { result, waitForNextUpdate } = renderHook(() => useContributorContributionList(), {
          wrapper: TestQueryClientProvider
        });

        await waitForNextUpdate();
        await result.current.cancelRecurringContribution(result.current.contributions[0]);
        await waitForNextUpdate();
        expect(result.current.contributions).toEqual([mockGetResponse.results[1]]);
      });
    });

    describe('If the DELETE fails', () => {
      let errorSpy: jest.SpyInstance;

      beforeEach(() => {
        axiosMock.onDelete(`subscriptions/${mockGetResponse.results[0].subscription_id}/`).networkError();
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      });

      afterEach(() => errorSpy.mockRestore());

      it('logs the error to the console', async () => {
        const { result, waitForNextUpdate } = renderHook(() => useContributorContributionList(), {
          wrapper: TestQueryClientProvider
        });

        await waitForNextUpdate();
        expect(errorSpy).not.toBeCalled();
        await result.current.cancelRecurringContribution(result.current.contributions[0]);
        expect(errorSpy).toBeCalledTimes(2); // Axios also logs an error
      });

      it('displays an error alert to the user', async () => {
        const error = jest.fn();

        useAlertMock.mockReturnValue({ error });
        const { result, waitForNextUpdate } = renderHook(() => useContributorContributionList(), {
          wrapper: TestQueryClientProvider
        });

        await waitForNextUpdate();
        expect(error).not.toBeCalled();
        await result.current.cancelRecurringContribution(result.current.contributions[0]);
        expect(error).toBeCalledTimes(1);
      });

      it("doesn't change the contribution list", async () => {
        const { result, waitForNextUpdate } = renderHook(() => useContributorContributionList(), {
          wrapper: TestQueryClientProvider
        });

        await waitForNextUpdate();
        await result.current.cancelRecurringContribution(result.current.contributions[0]);
        await waitForNextUpdate();
        expect(result.current.contributions).toEqual(mockGetResponse.results);
      });
    });

    it("logs an error and doesn't make a DELETE request if the contribution is not cancellable", async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { result, waitForNextUpdate } = renderHook(() => useContributorContributionList(), {
        wrapper: TestQueryClientProvider
      });

      await waitForNextUpdate();
      result.current.cancelRecurringContribution(result.current.contributions[1]);
      await Promise.resolve();
      expect(axiosMock.history.delete).toEqual([]);
      errorSpy.mockRestore();
    });
  });
});
