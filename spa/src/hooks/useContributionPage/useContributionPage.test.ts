import { renderHook } from '@testing-library/react-hooks';
import MockAdapter from 'axios-mock-adapter';
import { useAlert } from 'react-alert';
import { formDataToObject, TestQueryClientProvider } from 'test-utils';
import Axios from 'ajax/axios';
import useContributionPage from './useContributionPage';

jest.mock('react-alert');

const mockPage = {
  id: 'mock-page-id'
};

// eslint-disable-next-line react-hooks/rules-of-hooks
const testHook = () => useContributionPage('mock-rp-slug', 'mock-page-slug');

describe('useContributionPage', () => {
  const axiosMock = new MockAdapter(Axios);
  const useAlertMock = useAlert as jest.Mock;

  beforeEach(() => {
    axiosMock
      .onGet('pages/draft-detail/', { revenue_program: 'mock-rp-slug', page: 'mock-page-slug' })
      .reply(200, mockPage);
    useAlertMock.mockReturnValue({ error: jest.fn(), success: jest.fn() });
  });
  afterEach(() => axiosMock.reset());
  afterAll(() => axiosMock.restore());

  it('fetches the page from pages/draft-detail/ using the revenue program and slug provided', async () => {
    const { result, waitFor } = renderHook(testHook, { wrapper: TestQueryClientProvider });

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
    // the fetch completes.

    it('returns a loading status', async () => {
      const { result, waitForNextUpdate } = renderHook(testHook, { wrapper: TestQueryClientProvider });

      expect(result.current.isLoading).toBe(true);
      await waitForNextUpdate();
    });

    it('returns an undefined page', async () => {
      const { result, waitForNextUpdate } = renderHook(testHook, { wrapper: TestQueryClientProvider });

      expect(result.current.page).toBeUndefined();
      await waitForNextUpdate();
    });

    it("doesn't return deletePage or updatePage functions", async () => {
      const { result, waitForNextUpdate } = renderHook(testHook, { wrapper: TestQueryClientProvider });

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
      const { result, waitForNextUpdate } = renderHook(testHook, { wrapper: TestQueryClientProvider });

      await waitForNextUpdate();
      expect(result.current.isError).toBe(true);
    });

    it('returns an undefined page', async () => {
      const { result, waitForNextUpdate } = renderHook(testHook, { wrapper: TestQueryClientProvider });

      await waitForNextUpdate();
      expect(result.current.page).toBeUndefined();
    });

    it("doesn't return deletePage or updatePage functions", async () => {
      const { result, waitForNextUpdate } = renderHook(testHook, { wrapper: TestQueryClientProvider });

      expect(result.current.deletePage).toBeUndefined();
      expect(result.current.updatePage).toBeUndefined();
      await waitForNextUpdate();
    });
  });

  it('refetches the page using the same query params when the refetch function is called', async () => {
    const { result, waitFor } = renderHook(testHook, { wrapper: TestQueryClientProvider });

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

  describe('The deletePage function', () => {
    it('makes a DELETE request to pages/', async () => {
      axiosMock.onDelete(`pages/${mockPage.id}/`).reply(204);

      const { result, waitForNextUpdate } = renderHook(testHook, { wrapper: TestQueryClientProvider });

      await waitForNextUpdate();
      expect(axiosMock.history.delete.length).toBe(0);
      await result.current.deletePage!();
      expect(axiosMock.history.delete.length).toBe(1);
      await waitForNextUpdate();
    });

    describe('If the DELETE fails', () => {
      let errorSpy: jest.SpyInstance;

      beforeEach(() => {
        axiosMock.onDelete(`pages/${mockPage.id}/`).networkError();
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      });

      afterEach(() => errorSpy.mockRestore());

      it('logs the error to the console', async () => {
        const { result, waitForNextUpdate } = renderHook(testHook, { wrapper: TestQueryClientProvider });

        await waitForNextUpdate();
        expect(errorSpy).not.toBeCalled();

        try {
          await result.current.deletePage!();
        } catch {}

        expect(errorSpy).toBeCalledTimes(2); // Axios also logs an error
      });

      it('displays an error alert to the user', async () => {
        const error = jest.fn();

        useAlertMock.mockReturnValue({ error });

        const { result, waitForNextUpdate } = renderHook(testHook, { wrapper: TestQueryClientProvider });

        await waitForNextUpdate();
        expect(error).not.toBeCalled();

        try {
          await result.current.deletePage!();
        } catch {}

        expect(error).toBeCalledTimes(1);
      });

      it('rethrows the error', async () => {
        expect.assertions(1);

        const { result, waitForNextUpdate } = renderHook(testHook, { wrapper: TestQueryClientProvider });

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

      const { result, waitForNextUpdate } = renderHook(testHook, { wrapper: TestQueryClientProvider });

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

    it('displays a success notification if the PATCH succeeds', async () => {
      const success = jest.fn();

      useAlertMock.mockReturnValue({ success });

      axiosMock.onPatch(`pages/${mockPage.id}/`).reply(200, mockPage);

      const { result, waitForNextUpdate } = renderHook(testHook, { wrapper: TestQueryClientProvider });

      await waitForNextUpdate();
      expect(success).not.toBeCalled();
      await result.current.updatePage!({});
      expect(success).toBeCalledTimes(1);
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

        const { result, waitForNextUpdate } = renderHook(testHook, { wrapper: TestQueryClientProvider });

        await waitForNextUpdate();

        try {
          await result.current.updatePage!({});
        } catch (error) {
          // eslint-disable-next-line jest/no-conditional-expect
          expect(error).toBeInstanceOf(Error);
        }

        await waitForNextUpdate();
      });
    });
  });
});
