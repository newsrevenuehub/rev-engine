import { useQueryClient } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-hooks';
import Axios from 'ajax/axios';
import MockAdapter from 'axios-mock-adapter';
import { useSnackbar } from 'notistack';
import { TestQueryClientProvider } from 'test-utils';
import { usePortalContribution } from './usePortalContribution';

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
  status: 'paid'
};

function hook(contributorId: number, contributionId: number) {
  return renderHook(() => usePortalContribution(contributorId, contributionId), {
    wrapper: TestQueryClientProvider
  });
}

describe('usePortalContribution', () => {
  const useSnackbarMock = useSnackbar as jest.Mock;
  const axiosMock = new MockAdapter(Axios);

  beforeEach(() => {
    axiosMock.onGet('contributors/123/contributions/1/').reply(200, mockContributionResponse);
    useSnackbarMock.mockReturnValue({ enqueueSnackbar: jest.fn() });
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

  describe('cancelContribution', () => {
    let errorSpy: jest.SpyInstance;
    const useQueryClientMock = useQueryClient as jest.Mock;
    const invalidateQueries = jest.fn();
    const enqueueSnackbar = jest.fn();

    beforeEach(() => {
      errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      useQueryClientMock.mockReturnValue({
        invalidateQueries
      });
      useSnackbarMock.mockReturnValue({ enqueueSnackbar });
      axiosMock.onDelete('contributors/123/contributions/1/').reply(200);
    });

    afterEach(() => errorSpy.mockRestore());

    it('calls the cancel endpoint', async () => {
      const { result, waitFor } = hook(123, 1);

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));

      expect(axiosMock.history.delete.length).toBe(0);
      await result.current.cancelContribution(1);
      await waitFor(() => expect(axiosMock.history.delete.length).toBe(1));
      expect(axiosMock.history.delete[0].url).toBe('/contributors/123/contributions/1/');
    });

    it('invalidates the contribution list and detail query', async () => {
      const { result, waitFor } = hook(123, 1);

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));

      expect(invalidateQueries).not.toHaveBeenCalled();

      await result.current.cancelContribution(1);
      await waitFor(() => expect(axiosMock.history.delete.length).toBe(1));

      expect(invalidateQueries).toHaveBeenCalledTimes(2);
      expect(invalidateQueries).toHaveBeenCalledWith(['portalContributionList']);
      expect(invalidateQueries).toHaveBeenCalledWith(['portalContribution-123-1']);
    });

    it('shows a success notification if cancel succeeds', async () => {
      const { result, waitFor } = hook(123, 1);

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));

      expect(enqueueSnackbar).not.toHaveBeenCalled();
      await result.current.cancelContribution(1);
      await waitFor(() => expect(axiosMock.history.delete.length).toBe(1));

      expect(enqueueSnackbar).toHaveBeenCalledWith(
        'Your contribution has been successfully cancelled.',
        expect.objectContaining({ persist: true })
      );
    });

    it('shows the default error notification if cancel fails', async () => {
      axiosMock.onDelete('contributors/123/contributions/1/').networkError();

      const { result, waitFor } = hook(123, 1);

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));

      expect(enqueueSnackbar).not.toHaveBeenCalled();
      try {
        await result.current.cancelContribution(1);
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
        await result.current.cancelContribution(1);
      } catch {}

      await waitFor(() => expect(axiosMock.history.delete.length).toBe(1));

      await waitFor(() =>
        expect(enqueueSnackbar).toHaveBeenCalledWith('custom error message', expect.objectContaining({ persist: true }))
      );
    });
  });
});
