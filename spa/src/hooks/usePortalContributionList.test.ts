import MockAdapter from 'axios-mock-adapter';
import Axios from 'ajax/axios';
import { TestQueryClientProvider } from 'test-utils';
import { ContributionListResponse, usePortalContributionList } from './usePortalContributionList';
import { renderHook } from '@testing-library/react-hooks';
import { useHistory } from 'react-router-dom';

jest.mock('react-router-dom', () => ({
  useHistory: jest.fn()
}));

const mockContributionResponse: ContributionListResponse = {
  count: 2,
  results: [
    {
      amount: 123,
      card_brand: 'amex',
      created: 'mock-created-1',
      card_expiration_date: 'mock-cc-expiration-1',
      id: 1,
      interval: 'month',
      is_cancelable: true,
      is_modifiable: true,
      card_last_4: '1234',
      last_payment_date: 'mock-last-payment-1',
      next_payment_date: '',
      payment_type: 'mock-payment-type-1',
      revenue_program: 1,
      status: 'paid'
    },
    {
      amount: 456,
      card_brand: 'visa',
      created: 'mock-created-2',
      card_expiration_date: 'mock-cc-expiration-2',
      id: 2,
      interval: 'month',
      is_cancelable: true,
      is_modifiable: true,
      card_last_4: '5678',
      last_payment_date: 'mock-last-payment-2',
      next_payment_date: 'mock-next-payment-2',
      payment_type: 'mock-payment-type-2',
      revenue_program: 2,
      status: 'paid'
    }
  ]
};

function hook(contributorId?: number) {
  return renderHook(() => usePortalContributionList(contributorId), {
    wrapper: TestQueryClientProvider
  });
}

describe('usePortalContributionList', () => {
  const axiosMock = new MockAdapter(Axios);
  const useHistoryMock = jest.mocked(useHistory);

  beforeEach(() => {
    useHistoryMock.mockReturnValue({ push: jest.fn() });
    axiosMock.onGet('contributors/123/contributions/').reply(200, mockContributionResponse);
  });
  afterEach(() => axiosMock.reset());
  afterAll(() => axiosMock.restore());

  it("doesn't fetch contributions if contributor ID is undefined", async () => {
    hook();
    await Promise.resolve();
    expect(axiosMock.history.get.length).toBe(0);
  });

  describe('When contributor ID is defined', () => {
    describe('While fetching contributions', () => {
      // These wait for the next update to allow component updates to happen after
      // the fetch completes.

      it('returns a loading status', async () => {
        const { result, waitForNextUpdate } = hook(123);

        expect(result.current.isFetching).toBe(true);
        expect(result.current.isLoading).toBe(true);
        await waitForNextUpdate();
      });

      it('returns an empty array of contributions', async () => {
        const { result, waitForNextUpdate } = hook(123);

        expect(result.current.contributions).toEqual([]);
        await waitForNextUpdate();
      });
    });

    it('returns contributions and appropriate status after fetching contributions', async () => {
      const { result, waitFor } = hook(123);

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      expect(result.current.contributions).toEqual(mockContributionResponse.results);
      expect(axiosMock.history.get[0].url).toBe('/contributors/123/contributions/');
    });

    it('does not redirect if fetching succeeds', async () => {
      const push = jest.fn();
      useHistoryMock.mockReturnValue({ push });

      const { result, waitFor } = hook(123);

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      expect(push).not.toHaveBeenCalled();
      expect(result.error).toBeUndefined();
    });

    describe('When fetching contributions fails', () => {
      let errorSpy: jest.SpyInstance;
      const push = jest.fn();

      beforeEach(() => {
        useHistoryMock.mockReturnValue({ push });
        axiosMock.onGet('contributors/123/contributions/').networkError();
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      });
      afterEach(() => errorSpy.mockRestore());

      it('returns an error status', async () => {
        const { result, waitFor } = hook(123);

        await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
        expect(result.current.isError).toBe(true);
      });

      it('returns an empty array of contributions', async () => {
        const { result, waitFor } = hook(123);

        await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
        expect(result.current.contributions).toEqual([]);
      });

      it('does not redirect if error is not an Authentication Error', async () => {
        const { waitFor } = hook(123);

        await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
        expect(push).not.toHaveBeenCalled();
      });

      it('redirects user to magic link (login) page if error = Authentication Error', async () => {
        const assign = jest.fn();
        jest.spyOn(window.location, 'assign').mockImplementation(assign);

        axiosMock.onGet('contributors/123/contributions/').reply(401);

        expect(push).not.toHaveBeenCalled();

        const { result, waitFor } = hook(123);

        await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
        expect(assign).toHaveBeenCalledWith('/portal/');
        expect(result.current.isError).toBe(true);
        expect(result.current.contributions).toEqual([]);
      });
    });
  });
});
