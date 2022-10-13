import MockAdapter from 'axios-mock-adapter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-hooks';
import useUser from 'hooks/useUser';
import { USER_ROLE_ORG_ADMIN_TYPE } from 'constants/authConstants';
import useConnectStripeAccount from './useConnectStripeAccount';
import axios from 'ajax/axios';
import { getStripeAccountLinkStatusPath } from 'ajax/endpoints';

jest.mock('hooks/useUser');
jest.mock('react-alert', () => ({
  ...jest.requireActual('react-alert'),
  useAlert: jest.fn()
}));

const mock = new MockAdapter(axios);

describe('useConnectStripeAccount hook', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  beforeEach(() => {
    mock.reset();
  });

  it('should have the expected default state', () => {
    useUser.mockReturnValue({});
    const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useConnectStripeAccount(), { wrapper });
    expect(result.current).toEqual(
      expect.objectContaining({
        loading: true,
        requiresVerification: false,
        unverifiedReason: '',
        error: '',
        stripeConnectStarted: false
      })
    );
    expect(result.current.sendUserToStripe.toString()).toEqual((() => {}).toString());
  });

  it.each`
    rpStripeVerified | requiresVerification
    ${true}          | ${false}
    ${false}         | ${true}
  `(
    "should set requiresVerification to $requiresVerification when user's first RP stripeVerified is $rpStripeVerified",
    async ({ rpStripeVerified, requiresVerification }) => {
      useUser.mockReturnValue({
        user: {
          role_type: [USER_ROLE_ORG_ADMIN_TYPE],
          revenue_programs: [{ payment_provider_stripe_verified: rpStripeVerified, id: 'id' }]
        }
      });
      const queryClient = new QueryClient();
      const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
      const { result, waitFor } = renderHook(() => useConnectStripeAccount(), { wrapper });
      await waitFor(() => expect(result.current.requiresVerification).toEqual(requiresVerification));
    }
  );
  it.only('should update state as expected after retrieving account link status', async () => {
    const id = '1';
    useUser.mockReturnValue({
      user: {
        role_type: [USER_ROLE_ORG_ADMIN_TYPE],
        revenue_programs: [{ payment_provider_stripe_verified: false, id: id }]
      }
    });

    const response = {
      url: 'https://www.somewhere.com',
      reason: 'past_due',
      stripeConnectStarted: false
    };

    mock.onPost(getStripeAccountLinkStatusPath(id)).networkError();

    const queryClient = new QueryClient();
    const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const { result, waitFor } = renderHook(() => useConnectStripeAccount(), { wrapper });
    await waitFor(() =>
      expect(result.current).toEqual(
        expect.objectContaining({
          requiresVerification: true,
          unverifiedReason: response.reason,
          stripeConnectStarted: response.stripeConnectStarted
        })
      )
    );
    // https://www.csrhymes.com/2022/06/18/mocking-window-location-in-jest.html
    delete global.window.location;
    global.window = Object.create(window);
    global.window.location = {};
    result.current.sendUserToStripe();
    // expect(window.location.href).toEqual(response.url);
  });

  it('should update state as expected after error retreiving user', async () => {
    useUser.mockReturnValue(() => ({
      isError: true,
      isLoading: false
    }));
    const queryClient = new QueryClient();
    const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const { result, waitFor } = renderHook(() => useConnectStripeAccount(), { wrapper });
    await waitFor(() => result.current.error === 'Something went wrong when accessing account link status');
  });
  it('should update state as expected after API error retrieving account link status', async () => {
    const id = '1';
    useUser.mockReturnValue({
      user: {
        role_type: [USER_ROLE_ORG_ADMIN_TYPE],
        revenue_programs: [{ payment_provider_stripe_verified: true, id: id }]
      }
    });
    const queryClient = new QueryClient();
    const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const { result, waitFor } = renderHook(() => useConnectStripeAccount(), { wrapper });
    mock.onPost(getStripeAccountLinkStatusPath(id)).reply(500);
    await waitFor(() => result.current.error === 'Something went wrong when accessing the user');
  });
});
