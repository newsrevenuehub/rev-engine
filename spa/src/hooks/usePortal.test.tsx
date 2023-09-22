import { renderHook } from '@testing-library/react-hooks';
import Axios from 'ajax/axios';
import MockAdapter from 'axios-mock-adapter';
import { useSnackbar } from 'notistack';
import { TestQueryClientProvider } from 'test-utils';
import usePortal from './usePortal';

jest.mock('hooks/useSubdomain', () => ({
  __esModule: true,
  default: () => 'mock-subdomain'
}));
jest.mock('notistack', () => ({
  ...jest.requireActual('notistack'),
  useSnackbar: jest.fn()
}));

const mockPage = {
  id: 'mock-page-id'
};

describe('usePortal', () => {
  const axiosMock = new MockAdapter(Axios);
  const useSnackbarMock = useSnackbar as jest.Mock;
  const enqueueSnackbar = jest.fn();

  beforeEach(() => {
    axiosMock.onGet('pages/live-detail/').reply(200, mockPage);
    useSnackbarMock.mockReturnValue({ enqueueSnackbar });
  });

  afterEach(() => axiosMock.reset());
  afterAll(() => axiosMock.restore());

  describe('Page live details fetch', () => {
    it('fetches the page from pages/live-detail/ using the revenue program slug provided', async () => {
      const { result, waitFor } = renderHook(usePortal, { wrapper: TestQueryClientProvider });

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      expect(axiosMock.history.get).toEqual([
        expect.objectContaining({
          url: 'pages/live-detail/',
          params: {
            revenue_program: 'mock-subdomain'
          }
        })
      ]);
      expect(result.current.page).toEqual(mockPage);
    });

    it('returns pageIsFetched = true', async () => {
      const { result, waitForNextUpdate } = renderHook(usePortal, { wrapper: TestQueryClientProvider });

      await waitForNextUpdate();
      expect(result.current.pageIsFetched).toBe(true);
    });

    describe('While fetching the page', () => {
      // These wait for the next update to allow component updates to happen after
      // the fetch completes. Otherwise, we'll get "Can't perform a React state
      // update on an unmounted component" warnings.

      it('returns an undefined page', async () => {
        const { result, waitForNextUpdate } = renderHook(usePortal, { wrapper: TestQueryClientProvider });

        expect(result.current.page).toBeUndefined();
        await waitForNextUpdate();
      });

      it('returns pageIsFetched = false', async () => {
        const { result, waitForNextUpdate } = renderHook(usePortal, { wrapper: TestQueryClientProvider });

        expect(result.current.pageIsFetched).toBe(false);
        await waitForNextUpdate();
      });
    });

    describe('When fetching the page fails', () => {
      let errorSpy: jest.SpyInstance;

      beforeEach(() => {
        axiosMock.reset();
        axiosMock.onGet('pages/live-detail/').networkError();
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      });

      afterEach(() => errorSpy.mockRestore());

      it('returns pageIsFetched = true', async () => {
        const { result, waitForNextUpdate } = renderHook(usePortal, { wrapper: TestQueryClientProvider });

        await waitForNextUpdate();
        expect(result.current.pageIsFetched).toBe(true);
      });

      it('returns an undefined page', async () => {
        const { result, waitForNextUpdate } = renderHook(usePortal, { wrapper: TestQueryClientProvider });

        await waitForNextUpdate();
        expect(result.current.page).toBeUndefined();
      });
    });
  });

  describe('The sendMagicLink function', () => {
    it('makes a POST request to contrib-email/', async () => {
      axiosMock.onPost(`contrib-email/`).reply(200);

      const { result, waitFor, waitForNextUpdate } = renderHook(usePortal, { wrapper: TestQueryClientProvider });

      await waitForNextUpdate();
      expect(axiosMock.history.post.length).toBe(0);
      await result.current.sendMagicLink({ email: 'mock-email' });

      await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
      expect(axiosMock.history.post[0]).toEqual(
        expect.objectContaining({
          url: 'contrib-email/',
          data: JSON.stringify({ email: 'mock-email', subdomain: 'mock-subdomain' })
        })
      );
    });

    it('returns magicLinkIsSuccess = true', async () => {
      axiosMock.onPost('contrib-email/').reply(200);

      const { result, waitFor, waitForNextUpdate } = renderHook(usePortal, { wrapper: TestQueryClientProvider });

      await waitForNextUpdate();
      expect(axiosMock.history.post.length).toBe(0);
      await result.current.sendMagicLink({ email: 'mock-email' });

      await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
      expect(result.current.magicLinkIsSuccess).toBe(true);
    });

    describe('If the POST fails', () => {
      let errorSpy: jest.SpyInstance;

      beforeEach(() => {
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      });

      afterEach(() => errorSpy.mockRestore());

      it('returns magicLinkError', async () => {
        axiosMock.onPost('contrib-email/').reply(400, { email: ['mock-error'] });
        const { result, waitForNextUpdate } = renderHook(usePortal, { wrapper: TestQueryClientProvider });

        await waitForNextUpdate();

        try {
          await result.current.sendMagicLink({ email: 'mock-email' });
        } catch {}

        await waitForNextUpdate();

        expect(result.current.magicLinkError).toEqual({ email: ['mock-error'] });
      });

      it('returns magicLinkError with too many attempts error', async () => {
        axiosMock.onPost('contrib-email/').reply(429);
        const { result, waitForNextUpdate } = renderHook(usePortal, { wrapper: TestQueryClientProvider });

        await waitForNextUpdate();

        try {
          await result.current.sendMagicLink({ email: 'mock-email' });
        } catch {}

        await waitForNextUpdate();

        expect(result.current.magicLinkError).toEqual({ email: ['Too many attempts. Try again in one minute.'] });
      });

      it('displays a snackbar error to the user', async () => {
        axiosMock.onPost('contrib-email/').reply(500, 'mock-error');
        const { result, waitFor, waitForNextUpdate } = renderHook(usePortal, { wrapper: TestQueryClientProvider });

        await waitForNextUpdate();
        expect(enqueueSnackbar).not.toBeCalled();

        try {
          await result.current.sendMagicLink({ email: 'mock-email' });
        } catch {}

        await waitFor(() => expect(enqueueSnackbar).toBeCalledTimes(1));
        expect(enqueueSnackbar).toBeCalledWith(
          'There’s been a problem sending your magic link. Please try again. If this issue persists, please contact revenginesupport@fundjournalism.org',
          expect.objectContaining({
            persist: true
          })
        );
      });
    });
  });
});
