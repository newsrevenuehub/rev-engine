import { renderHook } from '@testing-library/react-hooks';
import MockAdapter from 'axios-mock-adapter';
import { useAlert } from 'react-alert';
import { formDataToObject, TestQueryClientProvider, waitFor } from 'test-utils';
import Axios from 'ajax/axios';
import useContributionPage from './useContributionPage';
import { useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: jest.fn()
}));
jest.mock('react-alert');
jest.mock('notistack', () => ({
  ...jest.requireActual('notistack'),
  useSnackbar: jest.fn()
}));

const mockPage = {
  id: 'mock-page-id'
};

// eslint-disable-next-line react-hooks/rules-of-hooks
const testHookWithId = () => useContributionPage(1);
// eslint-disable-next-line react-hooks/rules-of-hooks
const testHookWithSlugs = () => useContributionPage('mock-rp-slug', 'mock-page-slug');

describe('useContributionPage', () => {
  const axiosMock = new MockAdapter(Axios);
  const useQueryClientMock = jest.mocked(useQueryClient);
  const useAlertMock = jest.mocked(useAlert);
  const useSnackbarMock = useSnackbar as jest.Mock;
  const enqueueSnackbar = jest.fn();

  beforeEach(() => {
    axiosMock.onGet('pages/1/').reply(200, mockPage);
    axiosMock
      .onGet('pages/draft-detail/', { revenue_program: 'mock-rp-slug', page: 'mock-page-slug' })
      .reply(200, mockPage);
    useAlertMock.mockReturnValue({ error: jest.fn(), success: jest.fn() } as any);
    useQueryClientMock.mockReturnValue({ invalidateQueries: jest.fn() } as any);
    useSnackbarMock.mockReturnValue({ enqueueSnackbar });
  });
  afterEach(() => axiosMock.reset());
  afterAll(() => axiosMock.restore());

  describe('When called with a page ID', () => {
    it('fetches the page from pages/draft-detail/ using the revenue program and slug provided', async () => {
      const { result, waitFor } = renderHook(testHookWithId, { wrapper: TestQueryClientProvider });

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      expect(axiosMock.history.get).toEqual([
        expect.objectContaining({
          url: 'pages/1/'
        })
      ]);
      expect(result.current.page).toEqual(mockPage);
    });

    describe('While fetching the page', () => {
      // These wait for the next update to allow component updates to happen after
      // the fetch completes. Otherwise, we'll get "Can't perform a React state
      // update on an unmounted component" warnings.

      it('returns a loading status', async () => {
        const { result, waitForNextUpdate } = renderHook(testHookWithId, { wrapper: TestQueryClientProvider });

        expect(result.current.isLoading).toBe(true);
        await waitForNextUpdate();
      });

      it('returns an undefined page', async () => {
        const { result, waitForNextUpdate } = renderHook(testHookWithId, { wrapper: TestQueryClientProvider });

        expect(result.current.page).toBeUndefined();
        await waitForNextUpdate();
      });

      it("doesn't return deletePage or updatePage functions", async () => {
        const { result, waitForNextUpdate } = renderHook(testHookWithId, { wrapper: TestQueryClientProvider });

        expect(result.current.deletePage).toBeUndefined();
        expect(result.current.updatePage).toBeUndefined();
        await waitForNextUpdate();
      });
    });

    describe('When fetching the page fails', () => {
      let errorSpy: jest.SpyInstance;

      beforeEach(() => {
        axiosMock.reset();
        axiosMock.onGet('pages/1/').networkError();
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      });
      afterEach(() => errorSpy.mockRestore());

      it('returns an error status', async () => {
        const { result, waitForNextUpdate } = renderHook(testHookWithId, { wrapper: TestQueryClientProvider });

        await waitForNextUpdate();
        expect(result.current.isError).toBe(true);
      });

      it('returns an undefined page', async () => {
        const { result, waitForNextUpdate } = renderHook(testHookWithId, { wrapper: TestQueryClientProvider });

        await waitForNextUpdate();
        expect(result.current.page).toBeUndefined();
      });

      it("doesn't return deletePage or updatePage functions", async () => {
        const { result, waitForNextUpdate } = renderHook(testHookWithId, { wrapper: TestQueryClientProvider });

        expect(result.current.deletePage).toBeUndefined();
        expect(result.current.updatePage).toBeUndefined();
        await waitForNextUpdate();
      });
    });

    it('refetches the page using the same query params when the refetch function is called', async () => {
      const { result, waitFor } = renderHook(testHookWithId, { wrapper: TestQueryClientProvider });

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      result.current.refetch();
      await waitFor(() => expect(axiosMock.history.get.length).toBe(2));
      expect(axiosMock.history.get[1]).toEqual(
        expect.objectContaining({
          url: 'pages/1/'
        })
      );
    });
  });

  describe('When called with a revenue program and page slug', () => {
    it('fetches the page from pages/draft-detail/ using the revenue program and slug provided', async () => {
      const { result, waitFor } = renderHook(testHookWithSlugs, { wrapper: TestQueryClientProvider });

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      expect(axiosMock.history.get).toEqual([
        expect.objectContaining({
          params: { page: 'mock-page-slug', revenue_program: 'mock-rp-slug' },
          url: 'pages/draft-detail/'
        })
      ]);
      expect(result.current.page).toEqual(mockPage);
    });

    describe('While fetching the page', () => {
      // These wait for the next update to allow component updates to happen after
      // the fetch completes. Otherwise, we'll get "Can't perform a React state
      // update on an unmounted component" warnings.

      it('returns a loading status', async () => {
        const { result, waitForNextUpdate } = renderHook(testHookWithSlugs, { wrapper: TestQueryClientProvider });

        expect(result.current.isLoading).toBe(true);
        await waitForNextUpdate();
      });

      it('returns an undefined page', async () => {
        const { result, waitForNextUpdate } = renderHook(testHookWithSlugs, { wrapper: TestQueryClientProvider });

        expect(result.current.page).toBeUndefined();
        await waitForNextUpdate();
      });

      it("doesn't return deletePage or updatePage functions", async () => {
        const { result, waitForNextUpdate } = renderHook(testHookWithSlugs, { wrapper: TestQueryClientProvider });

        expect(result.current.deletePage).toBeUndefined();
        expect(result.current.updatePage).toBeUndefined();
        await waitForNextUpdate();
      });
    });

    describe('When fetching the page fails', () => {
      let errorSpy: jest.SpyInstance;

      beforeEach(() => {
        axiosMock.reset();
        axiosMock.onGet('pages/draft-detail/').networkError();
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      });
      afterEach(() => errorSpy.mockRestore());

      it('returns an error status', async () => {
        const { result, waitForNextUpdate } = renderHook(testHookWithSlugs, { wrapper: TestQueryClientProvider });

        await waitForNextUpdate();
        expect(result.current.isError).toBe(true);
      });

      it('returns an undefined page', async () => {
        const { result, waitForNextUpdate } = renderHook(testHookWithSlugs, { wrapper: TestQueryClientProvider });

        await waitForNextUpdate();
        expect(result.current.page).toBeUndefined();
      });

      it("doesn't return deletePage or updatePage functions", async () => {
        const { result, waitForNextUpdate } = renderHook(testHookWithSlugs, { wrapper: TestQueryClientProvider });

        expect(result.current.deletePage).toBeUndefined();
        expect(result.current.updatePage).toBeUndefined();
        await waitForNextUpdate();
      });
    });

    it('refetches the page using the same query params when the refetch function is called', async () => {
      const { result, waitFor } = renderHook(testHookWithSlugs, { wrapper: TestQueryClientProvider });

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      result.current.refetch();
      await waitFor(() => expect(axiosMock.history.get.length).toBe(2));
      expect(axiosMock.history.get[1]).toEqual(
        expect.objectContaining({
          params: { page: 'mock-page-slug', revenue_program: 'mock-rp-slug' },
          url: 'pages/draft-detail/'
        })
      );
    });
  });

  describe('The deletePage function', () => {
    it('makes a DELETE request to pages/', async () => {
      axiosMock.onDelete(`pages/${mockPage.id}/`).reply(204);

      const { result, waitForNextUpdate } = renderHook(testHookWithSlugs, { wrapper: TestQueryClientProvider });

      await waitForNextUpdate();
      expect(axiosMock.history.delete.length).toBe(0);
      await result.current.deletePage!();
      expect(axiosMock.history.delete.length).toBe(1);
      await waitForNextUpdate();
    });

    it('invalidates the page list query if it succeeds', async () => {
      const invalidateQueries = jest.fn();

      useQueryClientMock.mockReturnValue({ invalidateQueries } as any);
      axiosMock.onDelete(`pages/${mockPage.id}/`).reply(204);

      const { result, waitForNextUpdate } = renderHook(testHookWithSlugs, {
        wrapper: TestQueryClientProvider
      });

      await waitForNextUpdate();
      await result.current.deletePage!();
      await waitForNextUpdate();
      expect(invalidateQueries.mock.calls).toEqual([[['pages']]]);
    });

    describe('If the DELETE fails', () => {
      let errorSpy: jest.SpyInstance;

      beforeEach(() => {
        axiosMock.onDelete(`pages/${mockPage.id}/`).networkError();
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      });

      afterEach(() => errorSpy.mockRestore());

      it('logs the error to the console', async () => {
        const { result, waitForNextUpdate } = renderHook(testHookWithSlugs, { wrapper: TestQueryClientProvider });

        await waitForNextUpdate();
        expect(errorSpy).not.toBeCalled();

        try {
          await result.current.deletePage!();
        } catch {}

        expect(errorSpy).toBeCalledTimes(2); // Axios also logs an error
      });

      it('displays an error alert to the user', async () => {
        const error = jest.fn();

        useAlertMock.mockReturnValue({ error, success: jest.fn() } as any);

        const { result, waitForNextUpdate } = renderHook(testHookWithSlugs, { wrapper: TestQueryClientProvider });

        await waitForNextUpdate();
        expect(error).not.toBeCalled();

        try {
          await result.current.deletePage!();
        } catch {}

        expect(error).toBeCalledTimes(1);
      });

      it('rethrows the error', async () => {
        expect.assertions(1);

        const { result, waitForNextUpdate } = renderHook(testHookWithSlugs, { wrapper: TestQueryClientProvider });

        await waitForNextUpdate();

        try {
          await result.current.deletePage!();
        } catch (error) {
          // eslint-disable-next-line jest/no-conditional-expect
          expect(error).toBeInstanceOf(Error);
        }

        await waitForNextUpdate();
      });
    });
  });

  describe('The updatePage function', () => {
    it('makes a PATCH request to the pages/', async () => {
      axiosMock.onPatch(`pages/${mockPage.id}/`).reply(200, mockPage);

      const { result, waitForNextUpdate } = renderHook(testHookWithSlugs, { wrapper: TestQueryClientProvider });

      await waitForNextUpdate();
      expect(axiosMock.history.patch.length).toBe(0);
      await result.current.updatePage!({ name: 'test-name' });
      expect(axiosMock.history.patch.length).toBe(1);
      expect(axiosMock.history.patch[0].url).toBe(`pages/${mockPage.id}/`);

      // How changes are serialized to form data, and screenshotting
      // functionality, is tested in pageUpdateToFormData.ts.

      expect(formDataToObject(axiosMock.history.patch[0].data as FormData)).toEqual({ name: 'test-name' });
      await waitForNextUpdate();
    });

    it('makes a PATCH request to styles/[id]/ if update contains an existing style', async () => {
      const mockStyles = { id: 'mock-style-id' };
      axiosMock.onPatch(`styles/${mockStyles.id}/`).reply(200, mockStyles);
      axiosMock.onPatch(`pages/${mockPage.id}/`).reply(200, mockPage);

      const { result, waitForNextUpdate } = renderHook(testHookWithSlugs, { wrapper: TestQueryClientProvider });

      await waitForNextUpdate();
      expect(axiosMock.history.patch.length).toBe(0);
      await result.current.updatePage!({ styles: mockStyles as any });
      expect(axiosMock.history.patch.length).toBe(2);
      expect(axiosMock.history.patch[0].url).toBe(`styles/${mockStyles.id}/`);
      expect(axiosMock.history.patch[1].url).toBe(`pages/${mockPage.id}/`);

      expect(axiosMock.history.patch[0].data).toEqual(JSON.stringify(mockStyles));
      expect(formDataToObject(axiosMock.history.patch[1].data as FormData)).toEqual({ styles: mockStyles.id });
      await waitForNextUpdate();
    });

    it('makes a POST request to styles/ if update contains a new style', async () => {
      const mockStyles = { fonts: 'mock-style-id' };
      axiosMock.onPost(`styles/`).reply(200, { id: 'mock-new-style-id' });
      axiosMock.onPatch(`pages/${mockPage.id}/`).reply(200, mockPage);

      const { result, waitForNextUpdate } = renderHook(testHookWithSlugs, { wrapper: TestQueryClientProvider });

      await waitForNextUpdate();
      expect(axiosMock.history.patch.length).toBe(0);
      await result.current.updatePage!({ styles: mockStyles as any });
      expect(axiosMock.history.post.length).toBe(1);
      expect(axiosMock.history.patch.length).toBe(1);
      expect(axiosMock.history.post[0].url).toBe(`styles/`);
      expect(axiosMock.history.patch[0].url).toBe(`pages/${mockPage.id}/`);

      expect(JSON.parse(axiosMock.history.post[0].data)).toEqual(
        expect.objectContaining({
          fonts: 'mock-style-id',
          name: expect.any(String)
        })
      );
      expect(formDataToObject(axiosMock.history.patch[0].data as FormData)).toEqual({ styles: 'mock-new-style-id' });
      await waitForNextUpdate();
    });

    it.each([
      ['PATCH', { id: 'mock-patch-style-id' }],
      ['POST', { font: 'mock-font' }]
    ])('shows an error notification if the styles %s fails', async (method, mockStyles) => {
      axiosMock.onPost(`styles/`).networkError();
      axiosMock.onPatch(`styles/mock-patch-style-id/`).networkError();

      const { result, waitForNextUpdate } = renderHook(testHookWithSlugs, { wrapper: TestQueryClientProvider });

      await waitForNextUpdate();
      expect(axiosMock.history.patch.length).toBe(0);
      expect(axiosMock.history.post.length).toBe(0);
      let err: any;
      try {
        await result.current.updatePage!({ styles: mockStyles as any });
      } catch (error) {
        err = error;
      }
      expect(err.message).toBe('Network Error');

      expect(axiosMock.history.post.length).toBe(method === 'POST' ? 1 : 0);
      expect(axiosMock.history.patch.length).toBe(method === 'PATCH' ? 1 : 0);

      await waitFor(() =>
        expect(enqueueSnackbar).toBeCalledWith(
          'Style changes were not saved. Please wait and try again or changes will be lost.',
          expect.objectContaining({
            persist: true
          })
        )
      );
    });

    it('displays a success notification if the PATCH succeeds', async () => {
      const success = jest.fn();

      useAlertMock.mockReturnValue({ success, error: jest.fn() } as any);

      axiosMock.onPatch(`pages/${mockPage.id}/`).reply(200, mockPage);

      const { result, waitForNextUpdate } = renderHook(testHookWithSlugs, { wrapper: TestQueryClientProvider });

      await waitForNextUpdate();
      expect(success).not.toBeCalled();
      await result.current.updatePage!({});
      expect(success).toBeCalledTimes(1);
    });

    it('invalidates the page and page list queries if it succeeds', async () => {
      const invalidateQueries = jest.fn();

      useQueryClientMock.mockReturnValue({ invalidateQueries } as any);
      axiosMock.onPatch(`pages/${mockPage.id}/`).reply(200, mockPage);

      const { result, waitForNextUpdate } = renderHook(testHookWithSlugs, {
        wrapper: TestQueryClientProvider
      });

      await waitForNextUpdate();
      await result.current.updatePage!({});
      await waitForNextUpdate();
      expect(invalidateQueries.mock.calls).toEqual([
        [['pages']],
        [{ queryKey: ['contributionPage', 'mock-rp-slug', 'mock-page-slug'] }]
      ]);
    });

    describe('If the PATCH fails', () => {
      let errorSpy: jest.SpyInstance;

      beforeEach(() => {
        axiosMock.onPatch(`pages/${mockPage.id}/`).networkError();
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      });

      afterEach(() => errorSpy.mockRestore());

      it('rethrows the error', async () => {
        expect.assertions(1);

        const { result, waitForNextUpdate } = renderHook(testHookWithSlugs, { wrapper: TestQueryClientProvider });

        await waitForNextUpdate();

        let err: any;
        try {
          await result.current.updatePage!({});
        } catch (error) {
          err = error;
        }
        expect(err).toBeInstanceOf(Error);

        await waitForNextUpdate();
      });
    });
  });
});
