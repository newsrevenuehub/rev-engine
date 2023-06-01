import { render, screen, waitFor } from 'test-utils';
import { useLocation } from 'react-router-dom';
import { useSnackbar } from 'notistack';

import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import Dashboard from './Dashboard';
import { CONTENT_SLUG } from 'routes';

import useConnectStripeAccount from 'hooks/useConnectStripeAccount';
import useConnectMailchimp from 'hooks/useConnectMailchimp';
import useFeatureFlags from 'hooks/useFeatureFlags';
import useUser from 'hooks/useUser';

jest.mock('components/common/Modal/AudienceListModal/AudienceListModal');
jest.mock('./sidebar/DashboardSidebar');
jest.mock('elements/GlobalLoading');
jest.mock('hooks/useFeatureFlags');
jest.mock('hooks/useRequest');
jest.mock('hooks/useUser');
jest.mock('hooks/useConnectMailchimp');
jest.mock('hooks/useConnectStripeAccount');
jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useLocation: jest.fn()
}));

jest.mock('notistack', () => ({
  ...jest.requireActual('notistack'),
  useSnackbar: jest.fn()
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
  const useConnectMailchimpMock = jest.mocked(useConnectMailchimp);
  const useFeatureFlagsMock = useFeatureFlags as jest.Mock;
  const useUserMock = useUser as jest.Mock;
  const useLocationMock = useLocation as jest.Mock;
  const useSnackbarMock = useSnackbar as jest.Mock;

  beforeEach(() => {
    useSnackbarMock.mockReturnValue({ enqueueSnackbar: jest.fn(), closeSnackbar: jest.fn() });
    useConnectMailchimpMock.mockReturnValue({
      requiresAudienceSelection: false,
      isLoading: false,
      connectedToMailchimp: false,
      isError: false,
      hasMailchimpAccess: true
    });
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
    const enqueueSnackbar = jest.fn();
    useSnackbarMock.mockReturnValue({ enqueueSnackbar, closeSnackbar: jest.fn() });
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
    expect(hideConnectionSuccess).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(enqueueSnackbar).toBeCalledWith(
        'Stripe verification has been completed. Your contribution page can now be published!',
        expect.objectContaining({
          persist: true
        })
      )
    );
  });

  it('should display Audience List modal if requiresAudienceSelection = true', () => {
    useConnectMailchimpMock.mockReturnValue({
      requiresAudienceSelection: true,
      revenueProgram: 'mock-rp' as any,
      isLoading: false,
      connectedToMailchimp: false,
      isError: false,
      hasMailchimpAccess: true
    });
    render(<Dashboard />);
    const audienceListModal = screen.getByTestId('mock-audience-list-modal');
    expect(audienceListModal).toBeInTheDocument();
    expect(audienceListModal).toHaveTextContent('mock-rp');
  });

  it('should not display Audience List modal if requiresAudienceSelection = false', () => {
    useConnectMailchimpMock.mockReturnValue({
      requiresAudienceSelection: false,
      revenueProgram: 'mock-rp' as any,
      isLoading: false,
      connectedToMailchimp: false,
      isError: false,
      hasMailchimpAccess: true
    });
    render(<Dashboard />);
    expect(screen.queryByTestId('mock-audience-list-modal')).not.toBeInTheDocument();
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
