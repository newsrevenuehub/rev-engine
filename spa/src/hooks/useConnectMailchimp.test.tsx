import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-hooks';
import { NRE_MAILCHIMP_CLIENT_ID } from 'appSettings';
import { MAILCHIMP_INTEGRATION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import useUser from 'hooks/useUser';
import { useSnackbar } from 'notistack';
import queryString from 'query-string';
import { ReactChild } from 'react';
import useConnectMailchimp, { MAILCHIMP_OAUTH_CALLBACK } from './useConnectMailchimp';
import { RevenueProgram } from './useContributionPage';
import useFeatureFlags from './useFeatureFlags';
import usePreviousState from './usePreviousState';
import { Organization, User } from './useUser.types';

jest.mock('hooks/useUser');
jest.mock('hooks/usePreviousState');
jest.mock('hooks/useFeatureFlags');
jest.mock('appSettings', () => ({
  NRE_MAILCHIMP_CLIENT_ID: 'mock-client-id'
}));
jest.mock('notistack', () => ({
  ...jest.requireActual('notistack'),
  useSnackbar: jest.fn()
}));

const useUserMock = jest.mocked(useUser);
const useFeatureFlagsMock = jest.mocked(useFeatureFlags);
const usePreviousStateMock = jest.mocked(usePreviousState);
const useSnackbarMock = useSnackbar as jest.Mock;
const enqueueSnackbar = jest.fn();

const mockRp = { id: 1, name: 'mock-rp-name', slug: 'mock-rp-slug' };

const mockUser: User = {
  email: 'mock@email.com',
  email_verified: true,
  flags: [],
  id: 'mock-id',
  organizations: [
    {
      name: 'mock-org-name',
      plan: {} as any,
      show_connected_to_mailchimp: false,
      show_connected_to_salesforce: false,
      show_connected_to_slack: false,
      slug: 'mock-org-slug'
    }
  ],
  revenue_programs: [mockRp as RevenueProgram],
  role_type: ['org_admin', 'Org Admin']
} as any;

const wrapper = ({ children }: { children: ReactChild }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('useConnectMailchimp hook', () => {
  const oldLocation = global.window.location;

  beforeEach(() => {
    useSnackbarMock.mockReturnValue({ enqueueSnackbar });
    useFeatureFlagsMock.mockReturnValue({
      flags: [{ name: MAILCHIMP_INTEGRATION_ACCESS_FLAG_NAME }],
      isLoading: false,
      isError: false
    });
    useUserMock.mockReturnValue({
      refetch: jest.fn(),
      isLoading: false,
      isError: false
    });

    // We do this because the hook returns a `sendUserToMailchimp()` function which sets `window.location.href` to the value
    // returned when we fetch account link status.
    //
    // https://www.csrhymes.com/2022/06/18/mocking-window-location-in-jest.html

    delete (global as any).window.location;
    global.window = Object.create(window);
    (global as any).window.location = { origin: oldLocation.origin };
  });

  afterEach(() => {
    (global as any).window.location = oldLocation;
  });

  it('returns a loading status when user data is loading', () => {
    useUserMock.mockReturnValue({ isError: false, isLoading: true, refetch: jest.fn() });

    const { result } = renderHook(() => useConnectMailchimp(), { wrapper });

    expect(result.current).toEqual({
      isError: false,
      isLoading: true,
      connectedToMailchimp: false,
      requiresAudienceSelection: false
    });
  });

  it('returns an error status if an error occurred loading user data', () => {
    useUserMock.mockReturnValue({ isError: true, isLoading: false, refetch: jest.fn() });

    const { result } = renderHook(() => useConnectMailchimp(), { wrapper });

    expect(result.current).toEqual({
      isError: true,
      isLoading: false,
      connectedToMailchimp: false,
      requiresAudienceSelection: false
    });
  });

  it('returns no action if user does not have mailchimp-integration-access feature flag', () => {
    useFeatureFlagsMock.mockReturnValue({ flags: [{ name: 'mock-random-flag' }], isError: false, isLoading: false });
    const { result } = renderHook(() => useConnectMailchimp(), { wrapper });

    expect(result.current).toEqual({
      isError: false,
      isLoading: false,
      connectedToMailchimp: false,
      requiresAudienceSelection: false
    });
  });

  it('returns no action if user does not have any revenue programs', () => {
    useUserMock.mockReturnValue({
      user: { ...mockUser, revenue_programs: [] },
      isError: false,
      isLoading: false,
      refetch: jest.fn()
    });
    const { result } = renderHook(() => useConnectMailchimp(), { wrapper });

    expect(result.current).toEqual({
      isError: false,
      isLoading: false,
      connectedToMailchimp: false,
      requiresAudienceSelection: false
    });
  });

  it('returns no action if user does not have any organizations', () => {
    useUserMock.mockReturnValue({
      user: { ...mockUser, organizations: [] },
      isError: false,
      isLoading: false,
      refetch: jest.fn()
    });
    const { result } = renderHook(() => useConnectMailchimp(), { wrapper });

    expect(result.current).toEqual({
      isError: false,
      isLoading: false,
      connectedToMailchimp: false,
      requiresAudienceSelection: false
    });
  });

  it('returns no action if user have multiple organizations', () => {
    useUserMock.mockReturnValue({
      user: {
        ...mockUser,
        organizations: [
          {
            id: 0,
            name: 'mock-org-name-1'
          },
          {
            id: 1,
            name: 'mock-org-name-2'
          }
        ] as Organization[]
      },
      isError: false,
      isLoading: false,
      refetch: jest.fn()
    });
    const { result } = renderHook(() => useConnectMailchimp(), { wrapper });

    expect(result.current).toEqual({
      isError: false,
      isLoading: false,
      connectedToMailchimp: false,
      requiresAudienceSelection: false
    });
  });

  describe('returns no action if user has mailchimp connected', () => {
    it('organization has show_connected_to_mailchimp = true', () => {
      useUserMock.mockReturnValue({
        user: {
          ...mockUser,
          organizations: [
            {
              id: 0,
              name: 'mock-org-name-1',
              show_connected_to_mailchimp: true,
              plan: { name: 'mock-plan' }
            }
          ] as unknown as Organization[]
        },
        isError: false,
        isLoading: false,
        refetch: jest.fn()
      });
      const { result } = renderHook(() => useConnectMailchimp(), { wrapper });

      expect(result.current).toEqual({
        isError: false,
        isLoading: false,
        connectedToMailchimp: true,
        organizationPlan: 'mock-plan',
        requiresAudienceSelection: false
      });
    });
    it('revenue program has mailchimp_integration_connected = true', () => {
      useUserMock.mockReturnValue({
        user: {
          ...mockUser,
          organizations: [
            {
              id: 0,
              name: 'mock-org-name-1'
            }
          ] as Organization[],
          revenue_programs: [{ ...mockRp, mailchimp_integration_connected: true } as any]
        },
        isError: false,
        isLoading: false,
        refetch: jest.fn()
      });
      const { result } = renderHook(() => useConnectMailchimp(), { wrapper });

      expect(result.current).toEqual({
        isError: false,
        isLoading: false,
        connectedToMailchimp: true,
        requiresAudienceSelection: false
      });
    });
  });

  it('returns no action if user has organization not in CORE or PLUS plan', () => {
    useUserMock.mockReturnValue({
      user: {
        ...mockUser,
        organizations: [
          {
            id: 0,
            name: 'mock-org-name-1',
            plan: { name: 'FREE' }
          }
        ] as Organization[]
      },
      isError: false,
      isLoading: false,
      refetch: jest.fn()
    });
    const { result } = renderHook(() => useConnectMailchimp(), { wrapper });

    expect(result.current).toEqual({
      isError: false,
      isLoading: false,
      connectedToMailchimp: false,
      organizationPlan: 'FREE',
      requiresAudienceSelection: false
    });
  });

  it('returns a sendUserToMailchimp() function which redirects the user to the URL provided by the API', async () => {
    const mailchimpURL = `https://login.mailchimp.com/oauth2/authorize?${queryString.stringify({
      response_type: 'code',
      client_id: NRE_MAILCHIMP_CLIENT_ID,
      redirect_uri: MAILCHIMP_OAUTH_CALLBACK
    })}`;
    useUserMock.mockReturnValue({
      user: {
        ...mockUser,
        organizations: [
          {
            id: 0,
            name: 'mock-org-name-1',
            plan: { name: 'CORE' }
          }
        ] as Organization[]
      },
      isError: false,
      isLoading: false,
      refetch: jest.fn()
    });
    const { result } = renderHook(() => useConnectMailchimp(), { wrapper });

    expect(typeof result.current.sendUserToMailchimp).toBe('function');
    result.current.sendUserToMailchimp!();
    expect(window.location.href).toEqual(mailchimpURL);
  });

  it('returns audience selected', async () => {
    useUserMock.mockReturnValue({
      user: {
        ...mockUser,
        organizations: [
          {
            id: 0,
            name: 'mock-org-name-1',
            plan: { name: 'CORE' }
          }
        ] as Organization[],
        revenue_programs: [
          {
            id: 0,
            name: 'mock-org-name-1',
            mailchimp_email_list: { id: '1', name: 'audience-1' },
            mailchimp_email_lists: [
              { id: '1', name: 'audience-1' },
              { id: '2', name: 'audience-2' }
            ]
          }
        ] as RevenueProgram[]
      },
      isError: false,
      isLoading: false,
      refetch: jest.fn()
    });
    const { result } = renderHook(() => useConnectMailchimp(), { wrapper });

    expect(result.current).toEqual({
      isError: false,
      isLoading: false,
      connectedToMailchimp: false,
      organizationPlan: 'CORE',
      requiresAudienceSelection: false,
      revenueProgram: {
        id: 0,
        name: 'mock-org-name-1',
        mailchimp_email_list: { id: '1', name: 'audience-1' },
        mailchimp_email_lists: [
          { id: '1', name: 'audience-1' },
          { id: '2', name: 'audience-2' }
        ]
      },
      sendUserToMailchimp: expect.any(Function)
    });
  });

  it('returns an audience lists without selected audience', async () => {
    useUserMock.mockReturnValue({
      user: {
        ...mockUser,
        organizations: [
          {
            id: 0,
            name: 'mock-org-name-1',
            plan: { name: 'CORE' }
          }
        ] as Organization[],
        revenue_programs: [
          {
            id: 0,
            name: 'mock-org-name-1',
            mailchimp_email_lists: [
              { id: '1', name: 'audience-1' },
              { id: '2', name: 'audience-2' }
            ]
          }
        ] as RevenueProgram[]
      },
      isError: false,
      isLoading: false,
      refetch: jest.fn()
    });
    const { result } = renderHook(() => useConnectMailchimp(), { wrapper });

    expect(result.current).toEqual({
      isError: false,
      isLoading: false,
      connectedToMailchimp: false,
      organizationPlan: 'CORE',
      requiresAudienceSelection: true,
      revenueProgram: {
        id: 0,
        name: 'mock-org-name-1',
        mailchimp_email_lists: [
          { id: '1', name: 'audience-1' },
          { id: '2', name: 'audience-2' }
        ]
      },
      sendUserToMailchimp: expect.any(Function)
    });
  });

  it('show connection success notification', async () => {
    usePreviousStateMock.mockReturnValue(false);
    useUserMock.mockReturnValueOnce({
      user: {
        ...mockUser,
        revenue_programs: [{ ...mockRp, mailchimp_integration_connected: true } as any]
      },
      isError: false,
      isLoading: false,
      refetch: jest.fn()
    });
    renderHook(() => useConnectMailchimp(), { wrapper });

    expect(enqueueSnackbar).toBeCalledWith(
      'You’ve successfully connected to Mailchimp! Your contributor data will sync automatically.',
      expect.objectContaining({
        persist: true
      })
    );
  });
});
