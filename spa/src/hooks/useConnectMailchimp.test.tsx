import { renderHook } from '@testing-library/react-hooks';
import { useSnackbar } from 'notistack';
import queryString from 'query-string';
import { NRE_MAILCHIMP_CLIENT_ID } from 'appSettings';
import { MAILCHIMP_INTEGRATION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import useUser from 'hooks/useUser';
import { TestQueryClientProvider } from 'test-utils';
import useConnectMailchimp, { MAILCHIMP_OAUTH_CALLBACK } from './useConnectMailchimp';
import { RevenueProgram } from './useContributionPage';
import useFeatureFlags from './useFeatureFlags';
import { Organization, User } from './useUser.types';

jest.mock('notistack', () => ({
  ...jest.requireActual('notistack'),
  useSnackbar: jest.fn()
}));
jest.mock('appSettings', () => ({
  NRE_MAILCHIMP_CLIENT_ID: 'mock-client-id'
}));
jest.mock('hooks/useUser');
jest.mock('hooks/useFeatureFlags');

const mockUseUserResult = {
  isError: false,
  isLoading: false,
  refetch: jest.fn(),
  setRefetchInterval: jest.fn(),
  user: {
    email: 'mock@email.com',
    email_verified: true,
    flags: [],
    id: 'mock-id',
    organizations: [
      {
        name: 'mock-org-name',
        plan: { name: 'CORE' },
        show_connected_to_mailchimp: false,
        show_connected_to_salesforce: false,
        show_connected_to_slack: false,
        slug: 'mock-org-slug'
      }
    ] as Organization[],
    revenue_programs: [{ id: 1, name: 'mock-rp-name', slug: 'mock-rp-slug' }] as RevenueProgram[],
    role_type: ['org_admin', 'Org Admin']
  } as User
};

const mockMailchimpLists = [
  { id: '1', name: 'audience-1' },
  { id: '2', name: 'audience-2' }
];

describe('useConnectMailchimp hook', () => {
  const oldLocation = global.window.location;
  const useUserMock = jest.mocked(useUser);
  const useFeatureFlagsMock = jest.mocked(useFeatureFlags);
  const useSnackbarMock = useSnackbar as jest.Mock;

  beforeEach(() => {
    useFeatureFlagsMock.mockReturnValue({
      flags: [{ name: MAILCHIMP_INTEGRATION_ACCESS_FLAG_NAME }],
      isLoading: false,
      isError: false
    });
    useSnackbarMock.mockReturnValue({ enqueueSnackbar: jest.fn() });
    useUserMock.mockReturnValue(mockUseUserResult);

    // We do this because the hook returns a `sendUserToMailchimp()` function
    // which sets `window.location.href` to the value returned when we fetch
    // account link status.
    //
    // https://www.csrhymes.com/2022/06/18/mocking-window-location-in-jest.html

    delete (global as any).window.location;
    global.window = Object.create(window);
    (global as any).window.location = { origin: oldLocation.origin };
  });

  afterEach(() => {
    (global as any).window.location = oldLocation;
  });

  it('returns a loading status and no functions when user data is loading', () => {
    useUserMock.mockReturnValue({ ...mockUseUserResult, isError: false, isLoading: true });

    const { result } = renderHook(() => useConnectMailchimp(), { wrapper: TestQueryClientProvider });

    expect(result.current).toEqual({
      isError: false,
      isLoading: true,
      connectedToMailchimp: false,
      requiresAudienceSelection: false
    });
  });

  it('returns an error status and no functions if an error occurred loading user data', () => {
    useUserMock.mockReturnValue({ isError: true, isLoading: false, refetch: jest.fn(), setRefetchInterval: jest.fn() });

    const { result } = renderHook(() => useConnectMailchimp(), { wrapper: TestQueryClientProvider });

    expect(result.current).toEqual({
      isError: true,
      isLoading: false,
      connectedToMailchimp: false,
      requiresAudienceSelection: false
    });
  });

  it('returns no functions if user does not have mailchimp-integration-access feature flag', () => {
    useFeatureFlagsMock.mockReturnValue({ flags: [{ name: 'mock-random-flag' }], isError: false, isLoading: false });

    const { result } = renderHook(() => useConnectMailchimp(), { wrapper: TestQueryClientProvider });

    expect(result.current).toEqual({
      isError: false,
      isLoading: false,
      connectedToMailchimp: false,
      requiresAudienceSelection: false
    });
  });

  it('returns no functions if user does not have any revenue programs', () => {
    useUserMock.mockReturnValue({ ...mockUseUserResult, user: { ...mockUseUserResult.user, revenue_programs: [] } });

    const { result } = renderHook(() => useConnectMailchimp(), { wrapper: TestQueryClientProvider });

    expect(result.current).toEqual({
      isError: false,
      isLoading: false,
      connectedToMailchimp: false,
      requiresAudienceSelection: false
    });
  });

  it('returns no functions if user does not have any organizations', () => {
    useUserMock.mockReturnValue({ ...mockUseUserResult, user: { ...mockUseUserResult.user, organizations: [] } });

    const { result } = renderHook(() => useConnectMailchimp(), { wrapper: TestQueryClientProvider });

    expect(result.current).toEqual({
      isError: false,
      isLoading: false,
      connectedToMailchimp: false,
      requiresAudienceSelection: false
    });
  });

  it('returns no functions if user has multiple organizations', () => {
    useUserMock.mockReturnValue({
      ...mockUseUserResult,
      user: {
        ...mockUseUserResult.user,
        organizations: [mockUseUserResult.user.organizations[0], mockUseUserResult.user.organizations[0]]
      }
    });

    const { result } = renderHook(() => useConnectMailchimp(), { wrapper: TestQueryClientProvider });

    expect(result.current).toEqual({
      isError: false,
      isLoading: false,
      connectedToMailchimp: false,
      requiresAudienceSelection: false
    });
  });

  it("returns no functions if the user's organization is connected to Mailchimp", () => {
    useUserMock.mockReturnValue({
      ...mockUseUserResult,
      user: {
        ...mockUseUserResult.user,
        organizations: [
          {
            id: 0,
            name: 'mock-org-name-1',
            show_connected_to_mailchimp: true,
            plan: { name: 'mock-plan' } as any
          } as Organization
        ]
      }
    });

    const { result } = renderHook(() => useConnectMailchimp(), { wrapper: TestQueryClientProvider });

    expect(result.current).toEqual({
      isError: false,
      isLoading: false,
      connectedToMailchimp: true,
      organizationPlan: 'mock-plan',
      requiresAudienceSelection: false,
      revenueProgram: mockUseUserResult.user.revenue_programs[0]
    });
  });

  it("returns no functions if the user's revenue program is connected to Mailchimp", () => {
    useUserMock.mockReturnValue({
      ...mockUseUserResult,
      user: {
        ...mockUseUserResult.user,
        revenue_programs: [
          { ...mockUseUserResult.user.revenue_programs[0], mailchimp_integration_connected: true } as any
        ]
      }
    });

    const { result } = renderHook(() => useConnectMailchimp(), { wrapper: TestQueryClientProvider });

    expect(result.current).toEqual({
      isError: false,
      isLoading: false,
      connectedToMailchimp: true,
      organizationPlan: 'CORE',
      requiresAudienceSelection: false,
      revenueProgram: { ...mockUseUserResult.user.revenue_programs[0], mailchimp_integration_connected: true }
    });
  });

  it("returns no functions if user's organization is on the FREE plan", () => {
    useUserMock.mockReturnValue({
      ...mockUseUserResult,
      user: {
        ...mockUseUserResult.user,
        organizations: [
          {
            id: 0,
            name: 'mock-org-name-1',
            plan: { name: 'FREE' }
          } as Organization
        ]
      }
    });

    const { result } = renderHook(() => useConnectMailchimp(), { wrapper: TestQueryClientProvider });

    expect(result.current).toEqual({
      isError: false,
      isLoading: false,
      connectedToMailchimp: false,
      organizationPlan: 'FREE',
      requiresAudienceSelection: false,
      revenueProgram: mockUseUserResult.user.revenue_programs[0]
    });
  });

  describe('When the user meets the criteria to connect Mailchimp', () => {
    beforeEach(() => {
      useUserMock.mockReturnValue({
        ...mockUseUserResult,
        user: {
          ...mockUseUserResult.user,
          revenue_programs: [
            {
              ...mockUseUserResult.user.revenue_programs[0],
              mailchimp_email_list: mockMailchimpLists[0],
              mailchimp_email_lists: mockMailchimpLists
            }
          ]
        }
      });
    });

    it('returns a sendUserToMailchimp() function which redirects the user to the URL provided by the API', async () => {
      const { result } = renderHook(() => useConnectMailchimp(), { wrapper: TestQueryClientProvider });

      expect(typeof result.current.sendUserToMailchimp).toBe('function');
      result.current.sendUserToMailchimp!();
      expect(window.location.href).toEqual(
        `https://login.mailchimp.com/oauth2/authorize?${queryString.stringify({
          response_type: 'code',
          client_id: NRE_MAILCHIMP_CLIENT_ID,
          redirect_uri: MAILCHIMP_OAUTH_CALLBACK
        })}`
      );
    });

    it("returns a mailchimp_email_list prop with the revenue program's selected email list", async () => {
      const { result } = renderHook(() => useConnectMailchimp(), { wrapper: TestQueryClientProvider });

      expect(result.current.revenueProgram?.mailchimp_email_list).toEqual(mockMailchimpLists[0]);
    });

    it('returns a mailchimp_email_lists prop with all possible email lists', async () => {
      const { result } = renderHook(() => useConnectMailchimp(), { wrapper: TestQueryClientProvider });

      expect(result.current.revenueProgram?.mailchimp_email_lists).toEqual(mockMailchimpLists);
    });

    describe.each([
      [
        'When their revenue program has neither mailchimp_email_lists set nor mailchimp_email_list',
        undefined,
        undefined,
        false
      ],
      [
        'When their revenue program has mailchimp_email_lists set, but not mailchimp_email_list',
        mockMailchimpLists,
        undefined,
        true
      ],
      [
        'When their revenue program has both mailchimp_email_lists and mailchimp_email_list set',
        mockMailchimpLists,
        mockMailchimpLists[0],
        false
      ]
    ])('%s', (_, mailchimp_email_lists, mailchimp_email_list, shouldRequireAudienceSection) => {
      let setRefetchInterval: jest.SpyInstance;

      beforeEach(() => {
        setRefetchInterval = jest.fn();
        useUserMock.mockReturnValue({
          ...mockUseUserResult,
          setRefetchInterval: setRefetchInterval as any,
          user: {
            ...mockUseUserResult.user,
            revenue_programs: [
              {
                ...mockUseUserResult.user.revenue_programs[0],
                mailchimp_email_lists,
                mailchimp_email_list
              }
            ]
          }
        });
      });

      it(`returns a ${shouldRequireAudienceSection} requiresAudienceSelection prop`, () => {
        const { result } = renderHook(() => useConnectMailchimp(), { wrapper: TestQueryClientProvider });

        expect(result.current.requiresAudienceSelection).toBe(shouldRequireAudienceSection);
      });

      if (shouldRequireAudienceSection) {
        it('resets the user refetch interval', () => {
          renderHook(() => useConnectMailchimp(), { wrapper: TestQueryClientProvider });
          expect(setRefetchInterval.mock.calls).toEqual([[false]]);
        });
      } else {
        it("doesn't reset the user refetch interval", () => {
          renderHook(() => useConnectMailchimp(), { wrapper: TestQueryClientProvider });
          expect(setRefetchInterval).not.toBeCalled();
        });
      }
    });

    it('shows a connection success notification if the mailchimp_integration_connected property of the RP changes from false to true', () => {
      const enqueueSnackbar = jest.fn();

      function mockWithConnection(mailchimp_integration_connected: boolean) {
        useUserMock.mockReturnValue({
          ...mockUseUserResult,
          user: {
            ...mockUseUserResult.user,
            revenue_programs: [
              {
                ...mockUseUserResult.user.revenue_programs[0],
                mailchimp_integration_connected,
                mailchimp_email_list: { id: '1', name: 'audience-1' },
                mailchimp_email_lists: [
                  { id: '1', name: 'audience-1' },
                  { id: '2', name: 'audience-2' }
                ]
              }
            ]
          }
        });
      }

      useSnackbarMock.mockReturnValue({ enqueueSnackbar });
      mockWithConnection(false);

      const { rerender } = renderHook(() => useConnectMailchimp(), { wrapper: TestQueryClientProvider });

      mockWithConnection(true);
      expect(enqueueSnackbar).not.toBeCalled();
      rerender();
      expect(enqueueSnackbar).toBeCalledWith(
        'You’ve successfully connected to Mailchimp! Your contributor data will sync automatically.',
        expect.objectContaining({
          persist: true
        })
      );
    });
  });
});
