import { renderHook } from '@testing-library/react-hooks';
import MockAdapter from 'axios-mock-adapter';
import { useSnackbar } from 'notistack';
import Axios from 'ajax/axios';
import { TestQueryClientProvider } from 'test-utils';
import { usePortalContribution } from './usePortalContribution';

jest.mock('notistack');

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
  status: 'paid'
};

function hook(contributorId: number, contributionId: number) {
  return renderHook(() => usePortalContribution(contributorId, contributionId), {
    wrapper: TestQueryClientProvider
  });
}

describe('usePortalContribution', () => {
  const axiosMock = new MockAdapter(Axios);
  const useSnackbarMock = jest.mocked(useSnackbar);
  let enqueueSnackbar: jest.Mock;

  beforeEach(() => {
    axiosMock.onGet('contributors/123/contributions/1/').reply(200, mockContributionResponse);
    axiosMock.onPatch('contributors/123/contributions/1/').reply(200);
  });

  beforeEach(() => {
    enqueueSnackbar = jest.fn();
    useSnackbarMock.mockReturnValue({ enqueueSnackbar } as any);
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

  describe('The updateContribution function', () => {
    // These wait for the next update to allow component updates to happen after
    // the fetch completes.

    it('is returned even when a contribution is loading', async () => {
      const { result, waitForNextUpdate } = hook(123, 1);

      expect(typeof result.current.updateContribution).toBe('function');
      await waitForNextUpdate();
    });

    it('makes a PATCH to /api/v1/contributions/', async () => {
      const { result, waitFor } = hook(123, 1);

      result.current.updateContribution({ provider_payment_method_id: 'new-id' }, 'paymentMethod');
      await waitFor(() => expect(axiosMock.history.patch.length).toBe(1));
      expect(axiosMock.history.patch[0]).toEqual(
        expect.objectContaining({
          data: JSON.stringify({ provider_payment_method_id: 'new-id' }),
          url: '/contributors/123/contributions/1/'
        })
      );
    });

    it('resolves with the request and shows a notification if the PATCH succeeds', async () => {
      const { result } = hook(123, 1);

      expect(
        await result.current.updateContribution({ provider_payment_method_id: 'new-id' }, 'paymentMethod')
      ).not.toBe(undefined);
      expect(enqueueSnackbar.mock.calls).toEqual([
        [
          'Your billing details have been successfully updated. Changes may not be reflected in portal immediately.',
          expect.objectContaining({ persist: true })
        ]
      ]);
    });

    it('rejects and shows an error notification if the PATCH fails', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = hook(123, 1);

      axiosMock.onPatch('contributors/123/contributions/1/').networkError();
      await expect(
        result.current.updateContribution({ provider_payment_method_id: 'new-id' }, 'paymentMethod')
      ).rejects.toThrow();
      expect(enqueueSnackbar.mock.calls).toEqual([
        [
          'A problem occurred while updating your contribution. Please try again.',
          expect.objectContaining({ persist: true })
        ]
      ]);
      errorSpy.mockRestore();
    });
  });
});
