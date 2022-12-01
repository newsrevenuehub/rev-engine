import { render, screen, within } from 'test-utils';
import { useLocation } from 'react-router-dom';

import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import Dashboard from './Dashboard';
import { CONTENT_SLUG } from 'routes';

import useConnectStripeAccount from 'hooks/useConnectStripeAccount';
import useFeatureFlags from 'hooks/useFeatureFlags';
import useUser from 'hooks/useUser';

jest.mock('elements/GlobalLoading');
jest.mock('hooks/useFeatureFlags');
jest.mock('hooks/useRequest');
jest.mock('hooks/useUser');
jest.mock('hooks/useConnectStripeAccount');
jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useLocation: jest.fn()
}));

const useUserMockDefaults = {
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
  user: {
    email: 'foo@bar.com',
    role_type: ['org_admin']
  }
};

describe('Dashboard', () => {
  const useConnectStripeAccountMock = useConnectStripeAccount as jest.Mock;
  const useFeatureFlagsMock = useFeatureFlags as jest.Mock;
  const useUserMock = useUser as jest.Mock;
  const useLocationMock = useLocation as jest.Mock;

  beforeEach(() => {
    useConnectStripeAccountMock.mockReturnValue({
      requiresVerification: false,
      displayConnectionSuccess: false,
      hideConnectionSuccess: jest.fn(),
      isLoading: false
    });
    useFeatureFlagsMock.mockReturnValue({
      flags: [{ name: CONTENT_SECTION_ACCESS_FLAG_NAME }],
      isLoading: false,
      isError: false
    });
    useUserMock.mockReturnValue({ ...useUserMockDefaults });
    useLocationMock.mockReturnValue({
      pathname: CONTENT_SLUG,
      search: '',
      state: {},
      hash: ''
    });
  });

  it('should display a system notification when Stripe Connect completes', async () => {
    const rpId = '1';
    const hideConnectionSuccess = jest.fn();
    useConnectStripeAccountMock.mockReturnValue({
      requiresVerification: false,
      displayConnectionSuccess: true,
      hideConnectionSuccess,
      isLoading: false
    });
    useUserMock.mockReturnValue({
      ...useUserMockDefaults,
      user: {
        ...useUserMockDefaults.user,
        revenue_programs: [{ payment_provider_stripe_verified: false, id: rpId }]
      }
    });
    render(<Dashboard />);
    const notification = await screen.findByRole('status');
    expect(notification).toBeVisible();
    expect(within(notification).getByRole('heading', { name: 'Stripe Successfully Connected!' })).toBeVisible();
    expect(
      within(notification).getByText(
        'Stripe verification has been completed. Your contribution page can now be published!'
      )
    ).toBeVisible();
    within(notification).getByRole('button', { name: 'close notification' }).click();
    expect(hideConnectionSuccess).toHaveBeenCalledTimes(1);
  });
  it('shows a loading status when Stripe account link status is loading', () => {
    useConnectStripeAccountMock.mockReturnValue({ isLoading: true });
    render(<Dashboard />);
    expect(screen.getByTestId('mock-global-loading')).toBeInTheDocument();
  });
  it('does not show a loading status when Stripe account link status is not loading', () => {
    useConnectStripeAccountMock.mockReturnValue({ isLoading: false });
    render(<Dashboard />);
    expect(screen.queryByTestId('mock-global-loading')).not.toBeInTheDocument();
  });
});
