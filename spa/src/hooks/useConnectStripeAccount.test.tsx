import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-hooks';
import MockAdapter from 'axios-mock-adapter';
import { ReactChild } from 'react';
import { useHistory } from 'react-router-dom';
import axios from 'ajax/axios';
import { getStripeAccountLinkStatusPath } from 'ajax/endpoints';
import useUser from 'hooks/useUser';
import { SIGN_IN } from 'routes';
import useConnectStripeAccount, { StripeAccountLinkStatusResponse } from './useConnectStripeAccount';
import { RevenueProgram } from './useRevenueProgram';
import { User } from './useUser.types';

jest.mock('hooks/useUser');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: jest.fn()
}));
jest.mock('react-alert', () => ({
  ...jest.requireActual('react-alert'),
  useAlert: () => ({ error: jest.fn() })
}));

const axiosMock = new MockAdapter(axios);
const useUserMock = jest.mocked(useUser);
const useHistoryMock = jest.mocked(useHistory);

const mockRp = { id: 1, name: 'mock-rp-name', slug: 'mock-rp-slug', payment_provider_stripe_verified: true };
const mockDisconnectedRp = { ...mockRp, payment_provider_stripe_verified: false };

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

const mockApiResponse: StripeAccountLinkStatusResponse = {
  url: 'mock-url',
  reason: 'pending_verification',
  stripeConnectStarted: false,
  requiresVerification: true
};

describe('useConnectStripeAccount hook', () => {
  const wrapper = ({ children }: { children: ReactChild }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  );
  beforeEach(() => {
    axiosMock.onPost(getStripeAccountLinkStatusPath(mockRp.id)).reply(200, mockApiResponse);
    useHistoryMock.mockReturnValue({ push: jest.fn() });
    useUserMock.mockReturnValue({
      refetch: jest.fn(),
      isLoading: true,
      isError: false
    });
  });

  afterEach(() => {
    axiosMock.reset();
  });

  it('returns a loading status when user data is loading', () => {
    useUserMock.mockReturnValue({ isError: false, isLoading: true, refetch: jest.fn() });

    const { result } = renderHook(() => useConnectStripeAccount(), { wrapper });

    expect(result.current).toEqual(expect.objectContaining({ isError: false, isLoading: true }));
  });

  it('returns an error status if an error occurred loading user data', () => {
    useUserMock.mockReturnValue({ isError: true, isLoading: false, refetch: jest.fn() });

    const { result } = renderHook(() => useConnectStripeAccount(), { wrapper });

    expect(result.current).toEqual(expect.objectContaining({ isError: true, isLoading: false }));
  });

  describe("When the user's first revenue program is not Stripe verified", () => {
    beforeEach(() => {
      useUserMock.mockReturnValue({
        isError: false,
        isLoading: false,
        refetch: jest.fn(),
        user: {
          ...mockUser,
          revenue_programs: [{ ...mockRp, payment_provider_stripe_verified: false } as RevenueProgram]
        }
      });
    });

    it("fetches the revenue program's Stripe status", async () => {
      const { waitFor } = renderHook(() => useConnectStripeAccount(), { wrapper });
      await waitFor(() => axiosMock.history.post.length > 0);
      expect(axiosMock.history.post[0].url).toBe(getStripeAccountLinkStatusPath(mockRp.id));
    });

    it('returns that the user needs to verify Stripe', async () => {
      const { result, waitFor } = renderHook(() => useConnectStripeAccount(), { wrapper });

      await waitFor(() => axiosMock.history.post.length > 0);
      expect(result.current).toEqual(
        expect.objectContaining({
          isError: false,
          isLoading: false,
          requiresVerification: true
        })
      );
    });

    it('returns the verification reason returned by the API', async () => {
      axiosMock
        .onPost(getStripeAccountLinkStatusPath(mockRp.id))
        .reply(200, { ...mockApiResponse, reason: 'mock-reason' });

      const { result, waitFor } = renderHook(() => useConnectStripeAccount(), { wrapper });

      await waitFor(() => axiosMock.history.post.length > 0);
      expect(result.current).toEqual(
        expect.objectContaining({
          unverifiedReason: 'mock-reason'
        })
      );
    });

    it('returns whether the connection has been started', async () => {
      axiosMock
        .onPost(getStripeAccountLinkStatusPath(mockRp.id))
        .reply(200, { ...mockApiResponse, stripeConnectStarted: true });

      const { result, waitFor } = renderHook(() => useConnectStripeAccount(), { wrapper });

      await waitFor(() => axiosMock.history.post.length > 0);
      expect(result.current).toEqual(
        expect.objectContaining({
          stripeConnectStarted: true
        })
      );
    });

    it('returns a sendUserToStripe() function which redirects the user to the URL provided by the API', async () => {
      const assignSpy = jest.spyOn(window.location, 'assign');

      axiosMock.onPost(getStripeAccountLinkStatusPath(mockRp.id)).reply(200, { ...mockApiResponse, url: 'mock-url' });

      const { result, waitFor } = renderHook(() => useConnectStripeAccount(), { wrapper });

      await waitFor(() => axiosMock.history.post.length > 0);
      expect(typeof result.current.sendUserToStripe).toBe('function');
      expect(assignSpy).not.toBeCalled();
      result.current.sendUserToStripe!();
      expect(assignSpy.mock.calls).toEqual([['mock-url']]);
    });

    it('returns an error state if retrieving connection status fails', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      axiosMock.onPost(getStripeAccountLinkStatusPath(mockRp.id)).networkError();

      const { result, waitFor } = renderHook(() => useConnectStripeAccount(), { wrapper });

      await waitFor(() => axiosMock.history.post.length > 0);
      expect(result.current).toEqual(expect.objectContaining({ isError: true, isLoading: false }));
      errorSpy.mockReset();
    });

    it('asks the user to sign in again if retrieving connection status fails because of authentication', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const historyPush = jest.fn();

      axiosMock.onPost(getStripeAccountLinkStatusPath(mockRp.id)).reply(401);
      useHistoryMock.mockReturnValue({ push: historyPush });
      const { result, waitFor } = renderHook(() => useConnectStripeAccount(), { wrapper });

      await waitFor(() => axiosMock.history.post.length > 0);
      expect(result.current).toEqual(expect.objectContaining({ isError: true, isLoading: false }));
      expect(historyPush.mock.calls).toEqual([[SIGN_IN]]);
      errorSpy.mockReset();
    });
  });

  describe("When the user's first revenue program is Stripe verified", () => {
    beforeEach(() => {
      useUserMock.mockReturnValue({
        isError: false,
        isLoading: false,
        refetch: jest.fn(),
        user: {
          ...mockUser,
          revenue_programs: [{ ...mockRp, payment_provider_stripe_verified: true } as RevenueProgram]
        }
      });
    });

    it("returns that the user doesn't need to verify Stripe", () => {
      const { result } = renderHook(() => useConnectStripeAccount(), { wrapper });

      expect(result.current).toEqual(
        expect.objectContaining({
          isError: false,
          isLoading: false,
          requiresVerification: false
        })
      );
    });

    it('does not fetch Stripe connection status', () => {
      renderHook(() => useConnectStripeAccount(), { wrapper });
      expect(axiosMock.history.post.length).toBe(0);
    });
  });

  describe('When the user is an org admin but their org has no revenue programs', () => {
    beforeEach(() => {
      useUserMock.mockReturnValue({
        isError: false,
        isLoading: false,
        refetch: jest.fn(),
        user: { ...mockUser, revenue_programs: [] }
      });
    });

    it("returns that the user doesn't need to verify Stripe", () => {
      const { result } = renderHook(() => useConnectStripeAccount(), { wrapper });

      expect(result.current).toEqual(
        expect.objectContaining({
          isError: false,
          isLoading: false,
          requiresVerification: false,
          stripeConnectStarted: false
        })
      );
    });

    it('does not fetch Stripe connection status', () => {
      renderHook(() => useConnectStripeAccount(), { wrapper });
      expect(axiosMock.history.post.length).toBe(0);
    });
  });

  describe('When the user is an org admin but their org has multiple revenue programs', () => {
    beforeEach(() => {
      useUserMock.mockReturnValue({
        isError: false,
        isLoading: false,
        refetch: jest.fn(),
        user: { ...mockUser, revenue_programs: [mockDisconnectedRp, mockDisconnectedRp] as any }
      });
    });

    it("returns that the user doesn't need to verify Stripe", () => {
      const { result } = renderHook(() => useConnectStripeAccount(), { wrapper });

      expect(result.current).toEqual(
        expect.objectContaining({
          isError: false,
          isLoading: false,
          requiresVerification: false,
          stripeConnectStarted: false
        })
      );
    });

    it('does not fetch Stripe connection status', () => {
      renderHook(() => useConnectStripeAccount(), { wrapper });
      expect(axiosMock.history.post.length).toBe(0);
    });
  });

  describe('When the user is a Hub admin', () => {
    beforeEach(() => {
      useUserMock.mockReturnValue({
        isError: false,
        isLoading: false,
        refetch: jest.fn(),
        user: {
          ...mockUser,
          revenue_programs: [mockDisconnectedRp, mockDisconnectedRp] as any,
          role_type: ['hub_admin', 'Hub Admin']
        }
      });
    });

    it("returns that the user doesn't need to verify Stripe", () => {
      const { result } = renderHook(() => useConnectStripeAccount(), { wrapper });

      expect(result.current).toEqual(
        expect.objectContaining({
          isError: false,
          isLoading: false,
          requiresVerification: false,
          stripeConnectStarted: false
        })
      );
    });

    it('does not fetch Stripe connection status', () => {
      renderHook(() => useConnectStripeAccount(), { wrapper });
      expect(axiosMock.history.post.length).toBe(0);
    });
  });
});
