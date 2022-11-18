import { render, screen } from 'test-utils';

import Dashboard from './Dashboard';
import useConnectStripeAccount from 'hooks/useConnectStripeAccount';
import useFeatureFlags from 'hooks/useFeatureFlags';
import useUser from 'hooks/useUser';

jest.mock('elements/GlobalLoading');
jest.mock('hooks/useConnectStripeAccount');
jest.mock('hooks/useFeatureFlags');
jest.mock('hooks/useUser');

describe('Dashboard', () => {
  const useConnectStripeAccountMock = useConnectStripeAccount as jest.Mock;
  const useFeatureFlagsMock = useFeatureFlags as jest.Mock;
  const useUserMock = useUser as jest.Mock;

  beforeEach(() => {
    useFeatureFlagsMock.mockReturnValue({
      flags: [],
      isLoading: false,
      isError: false
    });
    useUserMock.mockReturnValue({
      isLoading: false,
      isError: false,
      refetch: jest.fn()
    });
  });
  it('shows a loading status when Stripe account link status is loading', () => {
    useConnectStripeAccountMock.mockReturnValue({ isLoading: true });
    render(<Dashboard />);
    expect(screen.getByTestId('mock-global-loading')).toBeInTheDocument();
  });
});
