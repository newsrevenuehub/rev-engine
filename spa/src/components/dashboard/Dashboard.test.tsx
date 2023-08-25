import { useSnackbar } from 'notistack';
import { useLocation } from 'react-router-dom';
import { render, screen, waitFor } from 'test-utils';

import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import { CONTENT_SLUG } from 'routes';
import Dashboard from './Dashboard';

import useConnectStripeAccount from 'hooks/useConnectStripeAccount';
import useUser from 'hooks/useUser';
import usePendo from 'hooks/usePendo';

jest.mock('components/common/Modal/AudienceListModal/AudienceListModal');
jest.mock('components/common/IntegrationCard/MailchimpIntegrationCard/MailchimpModal/MailchimpModal');
jest.mock('./MailchimpConnectionStatus', () => () => <div data-testid="mock-mailchimp-connection-status" />);
jest.mock('./sidebar/DashboardSidebar');
jest.mock('elements/GlobalLoading');
jest.mock('hooks/usePendo');
jest.mock('hooks/useRequest');
jest.mock('hooks/useUser');
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
    flags: [{ name: CONTENT_SECTION_ACCESS_FLAG_NAME }],
    role_type: ['org_admin']
  }
};

describe('Dashboard', () => {
  const usePendoMock = jest.mocked(usePendo);
  const useConnectStripeAccountMock = jest.mocked(useConnectStripeAccount);
  const useUserMock = jest.mocked(useUser);
  const useLocationMock = jest.mocked(useLocation);
  const useSnackbarMock = jest.mocked(useSnackbar);

  beforeEach(() => {
    useSnackbarMock.mockReturnValue({ enqueueSnackbar: jest.fn(), closeSnackbar: jest.fn() });
    useConnectStripeAccountMock.mockReturnValue({
      requiresVerification: false,
      displayConnectionSuccess: false,
      hideConnectionSuccess: jest.fn(),
      isLoading: false
    } as any);
    useUserMock.mockReturnValue(useUserMockDefaults as any);
    useLocationMock.mockReturnValue({
      pathname: CONTENT_SLUG,
      search: '',
      state: {},
      hash: ''
    });
  });

  it('should render mailchimp connection component', () => {
    render(<Dashboard />);
    expect(screen.getByTestId('mock-mailchimp-connection-status')).toBeInTheDocument();
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
    } as any);
    useUserMock.mockReturnValue({
      ...useUserMockDefaults,
      user: {
        ...useUserMockDefaults.user,
        revenue_programs: [{ payment_provider_stripe_verified: false, id: rpId }]
      } as any
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

  it('shows a loading status when Stripe account link status is loading', () => {
    useConnectStripeAccountMock.mockReturnValue({ isLoading: true } as any);
    render(<Dashboard />);
    expect(screen.getByTestId('mock-global-loading')).toBeInTheDocument();
  });

  it('does not show a loading status when Stripe account link status is not loading', () => {
    useConnectStripeAccountMock.mockReturnValue({ isLoading: false } as any);
    render(<Dashboard />);
    expect(screen.queryByTestId('mock-global-loading')).not.toBeInTheDocument();
  });

  it('loads Pendo', () => {
    render(<Dashboard />);
    expect(usePendoMock).toBeCalledTimes(1);
  });
});
