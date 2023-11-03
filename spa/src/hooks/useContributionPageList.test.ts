import MockAdapter from 'axios-mock-adapter';
import { useAlert } from 'react-alert';
import Axios from 'ajax/axios';
import { TestQueryClientProvider } from 'test-utils';
import useContributionPageList from './useContributionPageList';
import { renderHook } from '@testing-library/react-hooks';
import { useHistory } from 'react-router-dom';
import { USER_ROLE_HUB_ADMIN_TYPE, USER_ROLE_ORG_ADMIN_TYPE, USER_SUPERUSER_TYPE } from 'constants/authConstants';

jest.mock('react-router-dom', () => ({ useHistory: jest.fn() }));
jest.mock('react-alert');

const mockPages = [
  {
    id: 'mock-page-id-1',
    name: 'Page 1',
    revenue_program: { name: 'mock-rp', organization: { id: '1' } },
    slug: 'mock-rp-page-1'
  },
  {
    id: 'mock-page-id-2',
    name: 'Page 2',
    published_date: new Date().toString(),
    revenue_program: { name: 'mock-rp', organization: { id: '1' } },
    slug: 'mock-rp-page-2'
  }
];

function hook() {
  return renderHook(() => useContributionPageList(), { wrapper: TestQueryClientProvider });
}

describe('useContributionPageList', () => {
  const axiosMock = new MockAdapter(Axios);
  const useAlertMock = useAlert as jest.Mock;
  const useHistoryMock = useHistory as jest.Mock;

  beforeEach(() => {
    axiosMock.onGet('pages/').reply(200, mockPages);
    axiosMock.onPost('pages/').reply(200, mockPages[0]);
    useAlertMock.mockReturnValue({ error: jest.fn(), success: jest.fn() });
    useHistoryMock.mockReturnValue({ push: jest.fn() });
  });
  afterEach(() => axiosMock.reset());
  afterAll(() => axiosMock.restore());

  it('fetches a list of all pages', async () => {
    const { result, waitFor } = hook();

    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    expect(result.current.pages).toEqual(mockPages);
  });

  describe('While fetching', () => {
    it('returns an undefined list of pages', async () => {
      const { result, waitForNextUpdate } = hook();

      expect(result.current.pages).toBeUndefined();
      await waitForNextUpdate();
    });
  });

  describe("If there's an error fetching pages", () => {
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
      axiosMock.reset();
      axiosMock.onGet('pages/').networkError();
      errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => errorSpy.mockRestore());

    it('sends the user to sign in if the error was an authentication error', async () => {
      const push = jest.fn();

      useHistoryMock.mockReturnValue({ push });
      axiosMock.reset();
      axiosMock.onGet('pages/').reply(401, {});

      const { result, waitFor } = hook();

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(push.mock.calls).toEqual([['/sign-in/']]);
    });

    it("shows an alert if the error wasn't an authentication error", async () => {
      const error = jest.fn();

      useAlertMock.mockReturnValue({ error });

      const { result, waitFor } = hook();

      await waitFor(() => expect(result.current.isError).toBe(true));
      await waitFor(() => expect(error).toBeCalled());
      expect(error.mock.calls).toEqual([['We encountered an issue and have been notified. Please try again.']]);
    });

    it('returns an undefined list of pages', async () => {
      const { result, waitFor } = hook();

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.pages).toBeUndefined();
    });
  });

  describe('createPage()', () => {
    it('makes a POST request with the properties passed', async () => {
      const { result, waitFor } = hook();
      const data = { name: 'mock-name', revenue_program: 1, slug: 'mock-slug' };

      result.current.createPage({ name: 'mock-name', revenue_program: 1, slug: 'mock-slug' });
      await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
      expect(axiosMock.history.post[0]).toEqual(
        expect.objectContaining({
          url: 'pages/',
          data: JSON.stringify(data)
        })
      );
    });

    it('returns the API response if creation succeeded', async () => {
      const { result } = hook();
      const createResult = await result.current.createPage({} as any);

      expect(createResult).toEqual(mockPages[0]);
    });

    it('throws an error if creation failed', async () => {
      expect.assertions(1);

      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      axiosMock.reset();
      axiosMock.onGet('pages/').reply(200, []);
      axiosMock.onPost('pages/').networkError();

      const { result, waitForNextUpdate } = hook();

      try {
        await result.current.createPage({} as any);
      } catch (error) {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(error).toBeInstanceOf(Error);
      }

      await waitForNextUpdate();
      errorSpy.mockRestore();
    });
  });

  describe('newPageProperties', () => {
    it('returns a name for the revenue program passed', () => {
      const { result } = hook();

      expect(result.current.newPageProperties('mock-rp')).toEqual({ name: 'Page 1' });
    });

    it("returns a name that doesn't conflict with an existing page", async () => {
      const { result, waitFor } = hook();

      await waitFor(() => expect(result.current.pages?.length).toBe(2));
      expect(result.current.newPageProperties('mock-rp')).toEqual({ name: 'Page 3' });
    });

    it("returns a name that doesn't conflict, even if there are gaps in the numbering sequence in existing pages", async () => {
      axiosMock.reset();
      axiosMock.onGet('pages/').reply(200, [
        { id: 'mock-page-id-1', name: 'Page 1', revenue_program: { name: 'mock-rp' } },
        { id: 'mock-page-id-3', name: 'Page 3', revenue_program: { name: 'mock-rp' } }
      ]);

      const { result, waitFor } = hook();

      await waitFor(() => expect(result.current.pages?.length).toBe(2));
      expect(result.current.newPageProperties('mock-rp')).toEqual({ name: 'Page 4' });
    });

    it("ignores pages that aren't linked to the revenue program requested", async () => {
      axiosMock.reset();
      axiosMock.onGet('pages/').reply(200, [
        { id: 'mock-page-id-1', name: 'Page 1', revenue_program: { name: 'mock-rp' } },
        { id: 'mock-page-id-2', name: 'Page 2', revenue_program: { name: 'other-rp' } }
      ]);

      const { result, waitFor } = hook();

      await waitFor(() => expect(result.current.pages?.length).toBe(2));
      expect(result.current.newPageProperties('mock-rp')).toEqual({ name: 'Page 2' });
    });
  });

  describe('userCanCreatePage', () => {
    it('always returns true if the user is a Hub admin', () => {
      const { result } = hook();

      expect(result.current.userCanCreatePage({ role_type: [USER_ROLE_HUB_ADMIN_TYPE] } as any)).toBe(true);
    });

    it('always returns true if the user is a superuser', () => {
      const { result } = hook();

      expect(result.current.userCanCreatePage({ role_type: [USER_SUPERUSER_TYPE] } as any)).toBe(true);
    });

    it('returns false while pages are loading', () => {
      const { result } = hook();

      expect(
        result.current.userCanCreatePage({
          organizations: [{ plan: { page_limit: 0 } }],
          role_type: [USER_ROLE_ORG_ADMIN_TYPE]
        } as any)
      ).toBe(false);
    });

    it("returns true if the user is under their first organization's page limit", async () => {
      const { result, waitFor } = hook();

      await waitFor(() => expect(result.current.pages?.length).toBe(2));
      expect(
        result.current.userCanCreatePage({
          organizations: [{ plan: { page_limit: 3 } }, { plan: { page_limit: 0 } }],
          role_type: [USER_ROLE_ORG_ADMIN_TYPE]
        } as any)
      ).toBe(true);
    });

    it("returns false if the user is at their first organization's page limit", async () => {
      const { result, waitFor } = hook();

      await waitFor(() => expect(result.current.pages?.length).toBe(2));
      expect(
        result.current.userCanCreatePage({
          organizations: [{ plan: { page_limit: 2 } }, { plan: { page_limit: 0 } }],
          role_type: [USER_ROLE_ORG_ADMIN_TYPE]
        } as any)
      ).toBe(false);
    });

    it("returns false if the user is above their first organization's page limit", async () => {
      const { result, waitFor } = hook();

      await waitFor(() => expect(result.current.pages?.length).toBe(2));
      expect(
        result.current.userCanCreatePage({
          organizations: [{ plan: { page_limit: 1 } }, { plan: { page_limit: 0 } }],
          role_type: [USER_ROLE_ORG_ADMIN_TYPE]
        } as any)
      ).toBe(false);
    });
  });
});
