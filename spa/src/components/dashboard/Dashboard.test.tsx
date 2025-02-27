import { useLocation } from 'react-router-dom';
import { render, screen } from 'test-utils';

import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import { CONTENT_SLUG } from 'routes';
import Dashboard from './Dashboard';

import useUser from 'hooks/useUser';
import useDashboardPendo from 'hooks/useDashboardPendo';

jest.mock('components/common/Modal/AudienceListModal/AudienceListModal');
jest.mock('components/settings/Integration/IntegrationCard/MailchimpIntegrationCard/MailchimpModal/MailchimpModal');
jest.mock('components/dashboard/connectStripe/ConnectStripe');
jest.mock('./MailchimpConnectionStatus', () => () => <div data-testid="mock-mailchimp-connection-status" />);
jest.mock('./sidebar/DashboardSidebar');
jest.mock('hooks/useDashboardPendo');
jest.mock('hooks/useUser');
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
    flags: [{ name: CONTENT_SECTION_ACCESS_FLAG_NAME }],
    role_type: ['org_admin']
  }
};

describe('Dashboard', () => {
  const useDashboardPendoMock = jest.mocked(useDashboardPendo);
  const useUserMock = jest.mocked(useUser);
  const useLocationMock = jest.mocked(useLocation);

  beforeEach(() => {
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

  it('renders ConnectStripe', () => {
    render(<Dashboard />);
    expect(screen.getByTestId('mock-connect-stripe')).toBeInTheDocument();
  });

  it('loads Pendo', () => {
    render(<Dashboard />);
    expect(useDashboardPendoMock).toBeCalledTimes(1);
  });
});
