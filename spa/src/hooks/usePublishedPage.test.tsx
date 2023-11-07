import { renderHook } from '@testing-library/react-hooks';
import MockAdapter from 'axios-mock-adapter';
import Axios from 'ajax/axios';
import { TestQueryClientProvider } from 'test-utils';
import { ContributionPage } from './useContributionPage';
import { usePublishedPage } from './usePublishedPage';

const mockPage = {} as ContributionPage;

function hook(revenueProgramSlug: string, pageSlug: string) {
  return renderHook(() => usePublishedPage(revenueProgramSlug, pageSlug), { wrapper: TestQueryClientProvider });
}

describe('usePublishedPage', () => {
  const axiosMock = new MockAdapter(Axios);

  beforeEach(() => {
    axiosMock
      .onGet('pages/live-detail/', { params: { revenue_program: 'mock-rp-slug', page: 'mock-page-slug' } })
      .reply(200, mockPage);
  });

  afterEach(() => axiosMock.reset());

  it('retrieves the page given by the page slug and RP slug', async () => {
    const { result, waitFor } = hook('mock-rp-slug', 'mock-page-slug');

    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    expect(result.current.page).toEqual(mockPage);
  });

  it('returns an undefined page while fetching', async () => {
    const { result, waitForNextUpdate } = hook('mock-rp-slug', 'mock-page-slug');

    expect(result.current.page).toBeUndefined();
    await waitForNextUpdate();
  });

  describe('If fetching fails', () => {
    it('retries three times if a network error occurs', async () => {
      axiosMock.reset();
      axiosMock.onGet().networkError();

      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { result, waitFor } = hook('mock-rp-slug', 'mock-page-slug');

      await waitFor(() => expect(result.current.isError).toBe(true));

      // 4 = initial call plus 3 retries

      expect(axiosMock.history.get.length).toBe(4);
      errorSpy.mockRestore();
    });

    it("doesn't retry if the error was a 404", async () => {
      axiosMock.reset();

      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { result, waitFor } = hook('mock-rp-slug', 'mock-page-slug');

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(axiosMock.history.get.length).toBe(1);
      errorSpy.mockRestore();
    });

    it('returns the error', async () => {
      axiosMock.reset();
      axiosMock.onGet().networkError();

      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { result, waitFor } = hook('mock-rp-slug', 'mock-page-slug');

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(Error);
      errorSpy.mockRestore();
    });
  });
});
