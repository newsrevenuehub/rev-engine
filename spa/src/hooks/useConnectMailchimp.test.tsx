import { act, renderHook } from '@testing-library/react-hooks';
import Axios from 'ajax/axios';
import { NRE_MAILCHIMP_CLIENT_ID } from 'appSettings';
import MockAdapter from 'axios-mock-adapter';
import { MAILCHIMP_INTEGRATION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import useUser from 'hooks/useUser';
import queryString from 'query-string';
import { TestQueryClientProvider } from 'test-utils';
import useConnectMailchimp, { MAILCHIMP_OAUTH_CALLBACK } from './useConnectMailchimp';
import { User } from './useUser.types';

jest.mock('appSettings', () => ({
  NRE_MAILCHIMP_CLIENT_ID: 'mock-client-id'
}));
jest.mock('hooks/useUser');

const useUserMock = jest.mocked(useUser);

const mockUser: User = {
  email: 'mock@email.com',
  email_verified: true,
  flags: [{ name: MAILCHIMP_INTEGRATION_ACCESS_FLAG_NAME }],
  id: 'mock-id',
  organizations: [
    {
      name: 'mock-org-name',
      plan: { name: 'CORE' } as any,
      show_connected_to_mailchimp: false,
      show_connected_to_salesforce: false,
      show_connected_to_slack: false,
      slug: 'mock-org-slug'
    }
  ],
  revenue_programs: [{ id: 1, name: 'mock-rp-name', slug: 'mock-rp-slug' }],
  role_type: ['org_admin', 'Org Admin']
} as any;

const mockUseUserResult = {
  isError: false,
  isLoading: false,
  refetch: jest.fn(),
  user: mockUser
};

// URL is hardcoded so that if constant is mistakenly changed, the test
// will fail.

const mailchimpStatusEndpoint = `/revenue-programs/${mockUser.revenue_programs[0].id}/mailchimp_configure/`;

const mockMailchimpLists = [
  { id: '1', name: 'audience-1' },
  { id: '2', name: 'audience-2' }
];

function hook() {
  return renderHook(() => useConnectMailchimp(), { wrapper: TestQueryClientProvider });
}

describe('useConnectMailchimp hook', () => {
  const axiosMock = new MockAdapter(Axios);

  beforeEach(() => {
    useUserMock.mockReturnValue(mockUseUserResult);
    axiosMock.onGet(mailchimpStatusEndpoint).reply(200, {
      available_mailchimp_email_lists: mockMailchimpLists,
      chosen_mailchimp_email_list: mockMailchimpLists[0],
      mailchimp_list_id: mockMailchimpLists[0].id,
      mailchimp_integration_connected: true
    });
    axiosMock.onPatch(mailchimpStatusEndpoint).reply(200, {});
  });

  afterEach(() => axiosMock.reset());

  afterAll(() => axiosMock.restore());

  it('allows controlling the Mailchimp status refetch interval using the setRefetchInterval prop', async () => {
    const { result, waitFor } = hook();

    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    act(() => result.current.setRefetchInterval(30));

    // Without the act() call above, the query will never make another request
    // and the waitFor() will timeout.

    await waitFor(() => expect(axiosMock.history.get.length).toBe(2));
  });

  describe('While user data is loading', () => {
    beforeEach(() => useUserMock.mockReturnValue({ isError: false, isLoading: true, refetch: jest.fn() }));

    it('returns a loading status', () => {
      const { result } = hook();

      expect(result.current).toEqual({
        isError: false,
        isLoading: true,
        connectedToMailchimp: false,
        hasMailchimpAccess: false,
        setRefetchInterval: expect.any(Function)
      });
    });

    it('returns disconnected Mailchimp status', () => {
      const { result } = hook();

      expect(result.current.audiences).toBeUndefined();
      expect(result.current.connectedToMailchimp).toBe(false);
      expect(result.current.selectAudience).toBeUndefined();
      expect(result.current.selectedAudienceId).toBeUndefined();
      expect(result.current.sendUserToMailchimp).toBeUndefined();
    });

    it("doesn't fetch Mailchimp status", async () => {
      hook();
      await Promise.resolve();
      expect(axiosMock.history.get.length).toBe(0);
    });
  });

  describe('If loading user data failed', () => {
    beforeEach(() => useUserMock.mockReturnValue({ isError: true, isLoading: false, refetch: jest.fn() }));

    it('returns an error status', () => {
      const { result } = hook();

      expect(result.current).toEqual({
        isError: true,
        isLoading: false,
        connectedToMailchimp: false,
        hasMailchimpAccess: false,
        setRefetchInterval: expect.any(Function)
      });
    });

    it('returns disconnected Mailchimp status', () => {
      const { result } = hook();

      expect(result.current.audiences).toBeUndefined();
      expect(result.current.connectedToMailchimp).toBe(false);
      expect(result.current.selectAudience).toBeUndefined();
      expect(result.current.selectedAudienceId).toBeUndefined();
      expect(result.current.sendUserToMailchimp).toBeUndefined();
    });

    it("doesn't fetch Mailchimp status", async () => {
      hook();
      await Promise.resolve();
      expect(axiosMock.history.get.length).toBe(0);
    });
  });

  describe('When user data is available', () => {
    // waitFor()s at the end of some tests are to let pending updates complete
    // before the test is torn down.

    it("returns the user's first revenue program", async () => {
      const { result, waitFor } = hook();

      expect(result.current.revenueProgram).toBe(mockUser.revenue_programs[0]);
      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    });

    it("returns the plan of the user's first organization", async () => {
      const { result, waitFor } = hook();

      expect(result.current.organizationPlan).toBe(mockUser.organizations[0].plan.name);
      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    });

    it("returns the user's plan even if they don't have the Mailchimp access feature flag", async () => {
      useUserMock.mockReturnValue({
        ...mockUseUserResult,
        user: { ...mockUser, flags: [] }
      } as any);

      const { result, waitFor } = hook();

      expect(result.current.organizationPlan).toBe(mockUser.organizations[0].plan.name);
      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    });

    it('returns that the user has Mailchimp access if they have the feature flag', async () => {
      const { result, waitFor } = hook();

      expect(result.current.hasMailchimpAccess).toBe(true);
      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    });

    it("returns that the user has Mailchimp access if they have the feature flag, even if they're on a Free plan", async () => {
      useUserMock.mockReturnValue({
        ...mockUseUserResult,
        user: { ...mockUser, organizations: [{ ...mockUser.organizations[0], plan: { name: 'FREE' } as any }] }
      });

      const { result, waitFor } = hook();

      expect(result.current.hasMailchimpAccess).toBe(true);
      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    });

    it("returns that the user doesn't have Mailchimp access if they don't have the feature flag", async () => {
      useUserMock.mockReturnValue({
        ...mockUseUserResult,
        user: { ...mockUser, flags: [] }
      } as any);

      const { result, waitFor } = hook();

      expect(result.current.hasMailchimpAccess).toBe(false);
      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    });

    it('fetches Mailchimp status of the first revenue program', async () => {
      const { waitFor } = hook();

      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      expect(axiosMock.history.get).toEqual([
        expect.objectContaining({
          url: mailchimpStatusEndpoint
        })
      ]);
    });

    it("doesn't fetch Mailchimp status and returns a false isLoading status if the user has no revenue programs", async () => {
      useUserMock.mockReturnValue({ ...mockUseUserResult, user: { ...mockUser, revenue_programs: [] } });

      const { result } = hook();

      await Promise.resolve();
      expect(result.current.isLoading).toBe(false);
      expect(axiosMock.history.get.length).toBe(0);
    });

    it("doesn't fetch Mailchimp status and returns a false isLoading status if the user has more than one organization", async () => {
      useUserMock.mockReturnValue({
        ...mockUseUserResult,
        user: { ...mockUser, organizations: [mockUser.organizations[0], mockUser.organizations[0]] }
      });

      const { result } = hook();

      await Promise.resolve();
      expect(result.current.isLoading).toBe(false);
      expect(axiosMock.history.get.length).toBe(0);
    });

    it("doesn't fetch Mailchimp status and returns a false isLoading status if the user has no organizations", async () => {
      useUserMock.mockReturnValue({
        ...mockUseUserResult,
        user: { ...mockUser, organizations: [] }
      });

      const { result } = hook();

      await Promise.resolve();
      expect(result.current.isLoading).toBe(false);
      expect(axiosMock.history.get.length).toBe(0);
    });

    describe('While Mailchimp status is loading', () => {
      // Expect()s around Axios history below are to prove that the request is
      // still pending.

      it('returns an isError status of false', () => {
        const { result } = hook();

        expect(axiosMock.history.get.length).toBe(0);
        expect(result.current.isError).toBe(false);
      });

      it('returns an isLoading status of true', () => {
        const { result } = hook();

        expect(axiosMock.history.get.length).toBe(0);
        expect(result.current.isLoading).toBe(true);
      });

      it('returns disconnected Mailchimp status', () => {
        const { result } = hook();

        expect(result.current.audiences).toBeUndefined();
        expect(result.current.connectedToMailchimp).toBe(false);
        expect(result.current.selectAudience).toBeUndefined();
        expect(result.current.selectedAudienceId).toBeUndefined();
        expect(result.current.sendUserToMailchimp).toBeUndefined();
      });
    });

    describe('If loading Mailchimp status fails', () => {
      let errorSpy: jest.SpyInstance;

      beforeEach(() => {
        errorSpy = jest.spyOn(console, 'error').mockReturnValue();
        axiosMock.onGet(mailchimpStatusEndpoint).networkError();
      });

      afterEach(() => {
        errorSpy.mockRestore();
      });

      it('returns an isError status of true', async () => {
        const { result, waitFor } = hook();

        await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
        expect(result.current.isError).toBe(true);
      });

      it('returns an isLoading status of false', async () => {
        const { result, waitFor } = hook();

        await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
        expect(result.current.isLoading).toBe(false);
      });

      it('returns disconnected Mailchimp status', () => {
        const { result } = hook();

        expect(result.current.audiences).toBeUndefined();
        expect(result.current.connectedToMailchimp).toBe(false);
        expect(result.current.selectAudience).toBeUndefined();
        expect(result.current.selectedAudienceId).toBeUndefined();
        expect(result.current.sendUserToMailchimp).toBeUndefined();
      });
    });

    describe('When Mailchimp status has loaded', () => {
      it('returns an isError status of false', async () => {
        const { result, waitFor } = hook();

        await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
        expect(result.current.isError).toBe(false);
      });

      it('returns an isLoading status of false', async () => {
        const { result, waitFor } = hook();

        await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
        expect(result.current.isLoading).toBe(false);
      });

      it("returns a audiences property with the Mailchimp status's available_mailchimp_email_lists property", async () => {
        const { result, waitFor } = hook();

        await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
        expect(result.current.audiences).toEqual(mockMailchimpLists);
      });

      it("returns a selectedAudience property with the Mailchimp status's chosen_mailchimp_email_list property", async () => {
        const { result, waitFor } = hook();

        await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
        expect(result.current.selectedAudienceId).toEqual(mockMailchimpLists[0].id);
      });

      it('sets selectedAudience property to undefined if there is none in the Mailchimp status', async () => {
        axiosMock.onGet(mailchimpStatusEndpoint).reply(200, {
          available_mailchimp_email_lists: mockMailchimpLists,
          chosen_mailchimp_email_list: undefined,
          mailchimp_list_id: undefined,
          mailchimp_integration_connected: true
        });

        const { result, waitFor } = hook();

        await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
        expect(result.current.selectedAudienceId).toBeUndefined();
      });

      it.each([
        [false, false, false],
        [true, true, false],
        [true, false, true],
        [true, true, true]
      ])(
        "returns a %s connectedToMailchimp property if Mailchimp status reports %s and organization's show_connected_to_mailchimp is %s",
        async (connectedToMailchimp, mailchimp_integration_connected, show_connected_to_mailchimp) => {
          useUserMock.mockReturnValue({
            ...mockUseUserResult,
            user: { ...mockUser, organizations: [{ ...mockUser.organizations[0], show_connected_to_mailchimp }] }
          });
          axiosMock.onGet(mailchimpStatusEndpoint).reply(200, {
            mailchimp_integration_connected
          });

          const { result, waitFor } = hook();

          await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
          expect(result.current.connectedToMailchimp).toBe(connectedToMailchimp);
        }
      );

      it('returns a sendUserToMailchimp function which redirects the user to the URL provided by the API', async () => {
        const mailchimpURL = `https://login.mailchimp.com/oauth2/authorize?${queryString.stringify({
          response_type: 'code',
          client_id: NRE_MAILCHIMP_CLIENT_ID,
          redirect_uri: MAILCHIMP_OAUTH_CALLBACK
        })}`;
        const assignSpy = jest.spyOn(window.location, 'assign');
        const { result, waitFor } = hook();

        await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
        expect(typeof result.current.sendUserToMailchimp).toBe('function');
        expect(assignSpy).not.toBeCalled();
        result.current.sendUserToMailchimp!();
        expect(assignSpy.mock.calls).toEqual([[mailchimpURL]]);
      });

      it("doesn't return a sendUserToMailchimp function if the user doesn't have the Mailchimp access flag", async () => {
        useUserMock.mockReturnValue({
          ...mockUseUserResult,
          user: { ...mockUser, flags: [] }
        } as any);

        const { result, waitFor } = hook();

        await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
        expect(result.current.sendUserToMailchimp).toBeUndefined();
      });

      it.each([['FREE'], ['PLUS']])(
        "doesn't return a sendUserToMailchimp function if the user is on the %s plan",
        async (planName) => {
          useUserMock.mockReturnValue({
            ...mockUseUserResult,
            user: { ...mockUser, organizations: [{ ...mockUser.organizations[0], plan: { name: planName } as any }] }
          });
          const { result, waitFor } = hook();

          await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
          expect(result.current.sendUserToMailchimp).toBeUndefined();
        }
      );

      it('returns a selectAudience function that makes a PATCH request that sets mailchimp_list_id', async () => {
        const { result, waitFor } = hook();

        await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
        expect(typeof result.current.selectAudience).toBe('function');
        result.current.selectAudience!('100');
        await waitFor(() => expect(axiosMock.history.patch.length).toBe(1));
        expect(axiosMock.history.patch[0]).toEqual(
          expect.objectContaining({
            data: JSON.stringify({ mailchimp_list_id: '100' }),
            url: '/revenue-programs/1/mailchimp_configure/'
          })
        );
      });
    });
  });
});
