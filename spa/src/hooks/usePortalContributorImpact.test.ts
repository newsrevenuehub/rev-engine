import { renderHook } from '@testing-library/react-hooks';
import Axios from 'ajax/portal-axios';
import MockAdapter from 'axios-mock-adapter';
import { TestQueryClientProvider } from 'test-utils';
import { usePortalContributorImpact } from './usePortalContributorImpact';

jest.mock('react-router-dom', () => ({
  useHistory: jest.fn()
}));

const mockImpactResponse = {
  total: 123000,
  total_payments: 124000,
  total_refunded: 1000
};

function hook(contributorId?: number) {
  return renderHook(() => usePortalContributorImpact(contributorId), {
    wrapper: TestQueryClientProvider
  });
}

describe('usePortalContributorImpact', () => {
  const axiosMock = new MockAdapter(Axios);

  beforeEach(() => {
    axiosMock.onGet('/contributors/123/impact/').reply(200, mockImpactResponse);
  });
  afterEach(() => axiosMock.reset());
  afterAll(() => axiosMock.restore());

  it("doesn't fetch impact if contributor ID is undefined", async () => {
    hook();
    await Promise.resolve();
    expect(axiosMock.history.get.length).toBe(0);
  });

  describe('When contributor ID is defined', () => {
    describe('While fetching impact', () => {
      // These wait for the next update to allow component updates to happen after
      // the fetch completes.
      it('returns a loading status', async () => {
        const { result, waitForNextUpdate } = hook(123);

        expect(result.current.isLoading).toBe(true);
        await waitForNextUpdate();
      });

      it('returns undefined for impact', async () => {
        const { result, waitForNextUpdate } = hook(123);

        expect(result.current.impact).toEqual(undefined);
        await waitForNextUpdate();
      });
    });

    it('returns impact and appropriate status after fetching impact', async () => {
      const { result, waitFor } = hook(123);

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      expect(result.current.impact).toEqual(mockImpactResponse);
      expect(axiosMock.history.get[0].url).toBe('/contributors/123/impact/');
    });

    describe('When fetching contributions fails', () => {
      let errorSpy: jest.SpyInstance;

      beforeEach(() => {
        axiosMock.onGet('/contributors/123/impact/').networkError();
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      });
      afterEach(() => errorSpy.mockRestore());

      it('returns an error status', async () => {
        const { result, waitFor } = hook(123);

        await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
        expect(result.current.isError).toBe(true);
      });

      it('returns undefined for impact', async () => {
        const { result, waitFor } = hook(123);

        await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
        expect(result.current.impact).toEqual(undefined);
      });
    });
  });
});
