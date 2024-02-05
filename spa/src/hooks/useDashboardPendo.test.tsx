import { render, waitFor } from 'test-utils';
import { useDashboardPendo } from './useDashboardPendo';
import useUser from './useUser';
import useConnectStripeAccount from './useConnectStripeAccount';
import useConnectMailchimp from './useConnectMailchimp';
import { User } from './useUser.types';
import { loadPendo } from 'utilities/pendo';

jest.mock('utilities/pendo');
jest.mock('./useConnectMailchimp');
jest.mock('./useConnectStripeAccount');
jest.mock('./useUser');

const mockPendoVisitorPrefixGetter = jest.fn();

jest.mock('appSettings', () => ({
  get PENDO_VISITOR_PREFIX() {
    return mockPendoVisitorPrefixGetter();
  }
}));

const mockUser = {
  email: 'mock-user-email',
  id: 'mock-user-id',
  organizations: [{ id: 'mock-org-id', name: 'mock-organization-name', plan: { label: 'mock-plan-label' } }] as any,
  role_type: ['org_admin', 'Org Admin']
} as User;

const TestHookConsumer = () => {
  useDashboardPendo();
  return null;
};

function tree() {
  render(<TestHookConsumer />);
}

describe('useDashboardPendo', () => {
  const loadPendoMock = jest.mocked(loadPendo);
  const useConnectMailchimpMock = jest.mocked(useConnectMailchimp);
  const useConnectStripeAccountMock = jest.mocked(useConnectStripeAccount);
  const useUserMock = jest.mocked(useUser);
  let initializeMock: jest.SpyInstance;

  beforeEach(() => {
    mockPendoVisitorPrefixGetter.mockReturnValue('mock-pendo-visitor-prefix');
    useConnectMailchimpMock.mockReturnValue({
      connectedToMailchimp: true,
      isError: false,
      isLoading: false,
      hasMailchimpAccess: true,
      setRefetchInterval: jest.fn()
    });
    useConnectStripeAccountMock.mockReturnValue({
      isError: false,
      isLoading: false,
      displayConnectionSuccess: false,
      hideConnectionSuccess: jest.fn()
    });
    useUserMock.mockReturnValue({ isError: false, isLoading: false, refetch: jest.fn(), user: mockUser });
    initializeMock = jest.fn();
    (window as any).pendo = { initialize: initializeMock };
  });

  it("doesn't initialize Pendo if the user is not available", () => {
    useUserMock.mockReturnValue({ isError: false, isLoading: true, refetch: jest.fn() });
    tree();
    expect(loadPendoMock).not.toBeCalled();
    expect(initializeMock).not.toBeCalled();
  });

  it("doesn't initialize Pendo if the user is a Hub admin", () => {
    useUserMock.mockReturnValue({
      isError: false,
      isLoading: false,
      refetch: jest.fn(),
      user: {
        ...mockUser,
        role_type: ['hub_admin', 'Hub Admin']
      } as User
    });
    tree();
    expect(loadPendoMock).not.toBeCalled();
    expect(initializeMock).not.toBeCalled();
  });

  it("doesn't initialize Pendo if Stripe status is loading", () => {
    useConnectStripeAccountMock.mockReturnValue({
      isError: false,
      isLoading: true,
      displayConnectionSuccess: false,
      hideConnectionSuccess: jest.fn()
    });
    tree();
    expect(loadPendoMock).not.toBeCalled();
    expect(initializeMock).not.toBeCalled();
  });

  it("doesn't initialize Pendo if Mailchimp status is loading", () => {
    useConnectMailchimpMock.mockReturnValue({
      isError: false,
      isLoading: true,
      connectedToMailchimp: false,
      hasMailchimpAccess: false,
      setRefetchInterval: jest.fn()
    });
    tree();
    expect(loadPendoMock).not.toBeCalled();
    expect(initializeMock).not.toBeCalled();
  });

  it('initializes Pendo for org admins once Stripe and Mailchimp statuses are available', async () => {
    tree();
    expect(loadPendoMock).toBeCalledTimes(1);
    await waitFor(() => expect(initializeMock).toBeCalledTimes(1));
  });

  it('sets the visitor to a prefixed ID and email address', async () => {
    tree();
    await waitFor(() => expect(initializeMock).toBeCalledTimes(1));
    expect(initializeMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        visitor: expect.objectContaining({
          id: 'mock-pendo-visitor-prefix-user-mock-user-id',
          email: 'mock-user-email'
        })
      })
    );
  });

  it('sets the visitor role correctly', async () => {
    tree();
    await waitFor(() => expect(initializeMock).toBeCalledTimes(1));
    expect(initializeMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        visitor: expect.objectContaining({
          role: 'org_admin'
        })
      })
    );
  });

  it('sets the account to an unprefixed ID and name', async () => {
    tree();
    await waitFor(() => expect(initializeMock).toBeCalledTimes(1));
    expect(initializeMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        account: expect.objectContaining({
          id: 'mock-org-id',
          organization_name: 'mock-organization-name'
        })
      })
    );
  });

  it('sets the account plan correctly', async () => {
    tree();
    await waitFor(() => expect(initializeMock).toBeCalledTimes(1));
    expect(initializeMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        account: expect.objectContaining({
          organization_plan: 'mock-plan-label'
        })
      })
    );
  });

  it('sets the account Mailchimp status correctly when the org is connected to Mailchimp', async () => {
    useConnectMailchimpMock.mockReturnValue({
      isError: false,
      isLoading: false,
      connectedToMailchimp: true,
      hasMailchimpAccess: true,
      setRefetchInterval: jest.fn()
    });
    tree();
    await waitFor(() => expect(initializeMock).toBeCalledTimes(1));
    expect(initializeMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        account: expect.objectContaining({
          organization_is_connected_to_mailchimp: true
        })
      })
    );
  });

  it("sets the account Mailchimp status correctly when the org isn't connected to Mailchimp", async () => {
    useConnectMailchimpMock.mockReturnValue({
      isError: false,
      isLoading: false,
      connectedToMailchimp: false,
      hasMailchimpAccess: true,
      setRefetchInterval: jest.fn()
    });
    tree();
    await waitFor(() => expect(initializeMock).toBeCalledTimes(1));
    expect(initializeMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        account: expect.objectContaining({
          organization_is_connected_to_mailchimp: false
        })
      })
    );
  });

  it('sets the account Stripe status correctly when the org is Stripe verified', async () => {
    useConnectStripeAccountMock.mockReturnValue({
      isError: false,
      isLoading: false,
      displayConnectionSuccess: false,
      hideConnectionSuccess: jest.fn(),
      requiresVerification: false
    });
    tree();
    await waitFor(() => expect(initializeMock).toBeCalledTimes(1));
    expect(initializeMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        account: expect.objectContaining({
          organization_is_connected_to_stripe: true
        })
      })
    );
  });

  it("sets the account Stripe status correctly when the org isn't Stripe verified", async () => {
    useConnectStripeAccountMock.mockReturnValue({
      isError: false,
      isLoading: false,
      displayConnectionSuccess: false,
      hideConnectionSuccess: jest.fn(),
      requiresVerification: true
    });
    tree();
    await waitFor(() => expect(initializeMock).toBeCalledTimes(1));
    expect(initializeMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        account: expect.objectContaining({
          organization_is_connected_to_stripe: false
        })
      })
    );
  });
});
