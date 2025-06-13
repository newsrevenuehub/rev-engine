import { useQueryClient } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-hooks';
import MockAdapter from 'axios-mock-adapter';
import { useSnackbar } from 'notistack';
import Axios from 'ajax/axios';
import { getAdminContributionEndpoint } from 'ajax/endpoints';
import { TestQueryClientProvider } from 'test-utils';
import { useContribution } from './useContribution';

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

const mockContribution = {
  amount: 123,
  id: 123
};

function hook(contributionId: number) {
  return renderHook(() => useContribution(contributionId), {
    wrapper: TestQueryClientProvider
  });
}

describe('usePortalContribution', () => {
  const useQueryClientMock = useQueryClient as jest.Mock;
  const useSnackbarMock = useSnackbar as jest.Mock;
  const axiosMock = new MockAdapter(Axios);
  let enqueueSnackbar: jest.Mock;

  beforeEach(() => {
    axiosMock.onGet(getAdminContributionEndpoint(mockContribution.id)).reply(200, mockContribution);
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
      const { result, waitForNextUpdate } = hook(mockContribution.id);

      expect(result.current.isLoading).toBe(true);
      await waitForNextUpdate();
    });

    it('returns undefined data', async () => {
      const { result, waitForNextUpdate } = hook(mockContribution.id);

      expect(result.current.contribution).toBeUndefined();
      await waitForNextUpdate();
    });
  });

  it('returns the contribution and appropriate status after fetching', async () => {
    const { result, waitFor } = hook(mockContribution.id);

    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    expect(result.current.contribution).toEqual(mockContribution);
    expect(axiosMock.history.get[0].url).toBe(getAdminContributionEndpoint(mockContribution.id));
  });

  describe('When fetching the contribution fails', () => {
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
      axiosMock.onGet(getAdminContributionEndpoint(mockContribution.id)).networkError();
      errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => errorSpy.mockRestore());

    it('returns an error status', async () => {
      const { result, waitFor } = hook(mockContribution.id);

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      expect(result.current.isError).toBe(true);
    });

    it('returns an undefined contribution', async () => {
      const { result, waitFor } = hook(mockContribution.id);

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
      axiosMock.onDelete(getAdminContributionEndpoint(mockContribution.id)).reply(200);
    });

    afterEach(() => errorSpy.mockRestore());

    it('calls the cancel endpoint', async () => {
      const { result, waitFor } = hook(mockContribution.id);

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      expect(axiosMock.history.delete.length).toBe(0);
      await result.current.cancelContribution();
      await waitFor(() => expect(axiosMock.history.delete.length).toBe(1));
      expect(axiosMock.history.delete[0].url).toBe(getAdminContributionEndpoint(mockContribution.id));
    });

    it('shows a success notification if cancel succeeds', async () => {
      const { result, waitFor } = hook(mockContribution.id);

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      expect(enqueueSnackbar).not.toHaveBeenCalled();
      await result.current.cancelContribution();
      await waitFor(() => expect(axiosMock.history.delete.length).toBe(1));
      expect(enqueueSnackbar).toHaveBeenCalledWith(
        'The recurring contribution was successfully canceled.',
        expect.objectContaining({ persist: true })
      );
    });

    it('shows the default error notification if cancel fails', async () => {
      axiosMock.reset();
      axiosMock.onDelete(getAdminContributionEndpoint(mockContribution.id)).networkError();

      const { result, waitFor } = hook(mockContribution.id);

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      expect(enqueueSnackbar).not.toHaveBeenCalled();
      try {
        await result.current.cancelContribution();
      } catch {}
      await waitFor(() => expect(axiosMock.history.delete.length).toBe(1));
      expect(enqueueSnackbar).toHaveBeenCalledWith(
        'Failed to cancel the recurring contribution. Please wait and try again.',
        expect.objectContaining({ persist: true })
      );
    });

    it('invalidates the contribution detail query', async () => {
      const { result, waitFor } = hook(mockContribution.id);

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      expect(invalidateQueries).not.toHaveBeenCalled();
      await result.current.cancelContribution();
      await waitFor(() => expect(axiosMock.history.delete.length).toBe(1));
      expect(invalidateQueries).toHaveBeenCalledWith(['contribution', mockContribution.id]);
      expect(invalidateQueries).toHaveBeenCalledTimes(1);
    });
  });
});
