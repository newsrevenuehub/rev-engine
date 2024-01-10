import MockAdapter from 'axios-mock-adapter';
import { renderHook } from '@testing-library/react-hooks';
import Axios from 'ajax/axios';
import { TestQueryClientProvider } from 'test-utils';
import { usePortalContribution } from './usePortalContribution';

const mockContributionResponse = {
  amount: 123,
  card_brand: 'amex',
  created: 'mock-created-1',
  credit_card_expiration_date: 'mock-cc-expiration-1',
  interval: 'month',
  is_cancelable: true,
  is_modifiable: true,
  last4: '1234',
  last_payment_date: 'mock-last-payment-1',
  next_payment_date: '',
  payment_provider_id: 'mock-payment-provider-1',
  payment_type: 'mock-payment-type-1',
  provider_customer_id: 'mock-customer-1',
  revenue_program: 1,
  status: 'paid'
};

function hook(contributorId: number, contributionId: string) {
  return renderHook(() => usePortalContribution(contributorId, contributionId), {
    wrapper: TestQueryClientProvider
  });
}

describe('usePortalContribution', () => {
  const axiosMock = new MockAdapter(Axios);

  beforeEach(() => {
    axiosMock.onGet('contributors/123/contributions/mock-id/').reply(200, mockContributionResponse);
  });
  afterEach(() => axiosMock.reset());
  afterAll(() => axiosMock.restore());

  describe('While fetching the contribution', () => {
    // These wait for the next update to allow component updates to happen after
    // the fetch completes.

    it('returns a loading status', async () => {
      const { result, waitForNextUpdate } = hook(123, 'mock-id');

      expect(result.current.isFetching).toBe(true);
      expect(result.current.isLoading).toBe(true);
      await waitForNextUpdate();
    });

    it('returns undefined data', async () => {
      const { result, waitForNextUpdate } = hook(123, 'mock-id');

      expect(result.current.contribution).toBeUndefined();
      await waitForNextUpdate();
    });
  });

  it('returns the contribution and appropriate status after fetching', async () => {
    const { result, waitFor } = hook(123, 'mock-id');

    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    expect(result.current.contribution).toEqual(mockContributionResponse);
    expect(axiosMock.history.get[0].url).toBe('/contributors/123/contributions/mock-id/');
  });

  describe('When fetching the contribution fails', () => {
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
      axiosMock.onGet('contributors/123/contributions/mock-id/').networkError();
      errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => errorSpy.mockRestore());

    it('returns an error status', async () => {
      const { result, waitFor } = hook(123, 'mock-id');

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      expect(result.current.isError).toBe(true);
    });

    it('returns an undefined contribution', async () => {
      const { result, waitFor } = hook(123, 'mock-id');

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      expect(result.current.contribution).toBeUndefined();
    });
  });
});
