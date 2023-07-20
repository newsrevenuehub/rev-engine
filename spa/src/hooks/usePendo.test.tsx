import { cleanup, render } from 'test-utils';
import { usePendo } from './usePendo';
import useUser from './useUser';
import useConnectStripeAccount from './useConnectStripeAccount';
import useConnectMailchimp from './useConnectMailchimp';
import { User } from './useUser.types';

jest.mock('./useConnectMailchimp');
jest.mock('./useConnectStripeAccount');
jest.mock('./useUser');

const mockPendoApiKeyGetter = jest.fn();
const mockPendoVisitorPrefixGetter = jest.fn();

jest.mock('appSettings', () => ({
  get PENDO_API_KEY() {
    return mockPendoApiKeyGetter();
  },
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
  usePendo();
  return null;
};

function tree() {
  render(<TestHookConsumer />);
}

describe('usePendo', () => {
  const useConnectMailchimpMock = jest.mocked(useConnectMailchimp);
  const useConnectStripeAccountMock = jest.mocked(useConnectStripeAccount);
  const useUserMock = jest.mocked(useUser);

  beforeEach(() => {
    // The Pendo loader script adds a script tag on its own that we need to
    // manually clean up.

    document.body.innerHTML = '';
    mockPendoApiKeyGetter.mockReturnValue('mock-pendo-api-key');
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
  });

  describe('Loading the Pendo snippet', () => {
    /* eslint-disable testing-library/no-node-access */

    it('adds the Pendo loader to the document', () => {
      tree();
      expect(document.body.querySelector('script')).toBeInTheDocument();
    });

    it("doesn't add the Pendo loader twice even if the hook is invoked twice", () => {
      // The loader script creates its own script tag so the number of script tags
      // in the DOM may vary. We test by measuring the number of tags in a single
      // invocation, then running it twice.

      tree();

      const singleScriptCount = document.body.querySelectorAll('script').length;

      cleanup();
      document.body.innerHTML = '';
      expect(document.body.querySelectorAll('script').length).toBe(0);
      render(
        <>
          <TestHookConsumer />
          <TestHookConsumer />
        </>
      );
      expect(document.body.querySelectorAll('script').length).toBe(singleScriptCount);
    });

    it("doesn't add the Pendo loader if the API key isn't configured", () => {
      mockPendoApiKeyGetter.mockReturnValue('');
      tree();
      expect(document.querySelector('script')).not.toBeInTheDocument();
    });

    it("doesn't add the Pendo loader if the visitor prefix isn't configured", () => {
      mockPendoVisitorPrefixGetter.mockReturnValue('');
      tree();
      expect(document.querySelector('script')).not.toBeInTheDocument();
    });

    /* eslint-enable testing-library/no-node-access */
  });

  describe('initialization of Pendo', () => {
    let initializeMock: jest.SpyInstance;

    beforeEach(() => {
      initializeMock = jest.fn();
      (window as any).pendo = { initialize: initializeMock };

      // See note above about Pendo cleanup.
      document.body.innerHTML = '';
    });

    it("doesn't initialize Pendo if the user is not available", () => {
      useUserMock.mockReturnValue({ isError: false, isLoading: true, refetch: jest.fn() });
      tree();
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
      expect(initializeMock).not.toBeCalled();
    });

    it('initializes Pendo for org admins once Stripe and Mailchimp statuses are available', () => {
      tree();
      expect(initializeMock).toBeCalledTimes(1);
    });

    it('sets the visitor to a prefixed ID and email address', () => {
      tree();
      expect(initializeMock.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          visitor: expect.objectContaining({
            id: 'mock-pendo-visitor-prefix-user-mock-user-id',
            email: 'mock-user-email'
          })
        })
      );
    });

    it('sets the visitor role correctly', () => {
      tree();
      expect(initializeMock.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          visitor: expect.objectContaining({
            role: 'org_admin'
          })
        })
      );
    });

    it('sets the account to an unprefixed ID and name', () => {
      tree();
      expect(initializeMock.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          account: expect.objectContaining({
            id: 'mock-org-id',
            organization_name: 'mock-organization-name'
          })
        })
      );
    });

    it('sets the account plan correctly', () => {
      tree();
      expect(initializeMock.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          account: expect.objectContaining({
            organization_plan: 'mock-plan-label'
          })
        })
      );
    });

    it('sets the account Mailchimp status correctly when the org is connected to Mailchimp', () => {
      useConnectMailchimpMock.mockReturnValue({
        isError: false,
        isLoading: false,
        connectedToMailchimp: true,
        hasMailchimpAccess: true,
        setRefetchInterval: jest.fn()
      });
      tree();
      expect(initializeMock.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          account: expect.objectContaining({
            organization_is_connected_to_mailchimp: true
          })
        })
      );
    });

    it("sets the account Mailchimp status correctly when the org isn't connected to Mailchimp", () => {
      useConnectMailchimpMock.mockReturnValue({
        isError: false,
        isLoading: false,
        connectedToMailchimp: false,
        hasMailchimpAccess: true,
        setRefetchInterval: jest.fn()
      });
      tree();
      expect(initializeMock.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          account: expect.objectContaining({
            organization_is_connected_to_mailchimp: false
          })
        })
      );
    });

    it('sets the account Stripe status correctly when the org is Stripe verified', () => {
      useConnectStripeAccountMock.mockReturnValue({
        isError: false,
        isLoading: false,
        displayConnectionSuccess: false,
        hideConnectionSuccess: jest.fn(),
        requiresVerification: false
      });
      tree();
      expect(initializeMock.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          account: expect.objectContaining({
            organization_is_connected_to_stripe: true
          })
        })
      );
    });

    it("sets the account Stripe status correctly when the org isn't Stripe verified", () => {
      useConnectStripeAccountMock.mockReturnValue({
        isError: false,
        isLoading: false,
        displayConnectionSuccess: false,
        hideConnectionSuccess: jest.fn(),
        requiresVerification: true
      });
      tree();
      expect(initializeMock.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          account: expect.objectContaining({
            organization_is_connected_to_stripe: false
          })
        })
      );
    });
  });
});
