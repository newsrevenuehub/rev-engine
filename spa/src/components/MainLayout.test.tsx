import { ComponentType } from 'react';
import { render, screen, within } from 'test-utils';
import isContributorAppPath from 'utilities/isContributorAppPath';
import isPortalAppPath from 'utilities/isPortalAppPath';
import useSubdomain from 'hooks/useSubdomain';
import MainLayout from './MainLayout';

jest.mock('./analytics/AnalyticsContext', () => ({
  AnalyticsContextProvider: ({ children }: { children: ComponentType }) => (
    <div data-testid="mock-analytics-context-provider">{children}</div>
  )
}));
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  Suspense: ({ children }: { children: ComponentType }) => <div data-testid="mock-suspense">{children}</div>
}));
jest.mock('elements/modal/GlobalConfirmationModal', () => ({
  __esModule: true,
  default: ({ children }: { children: ComponentType }) => (
    <div data-testid="mock-global-confirmation-modal">{children}</div>
  )
}));
jest.mock('utilities/isContributorAppPath');
jest.mock('utilities/isPortalAppPath');
jest.mock('hooks/useSubdomain');
jest.mock('components/authentication/ReauthModal', () => () => <div data-testid="mock-reauth-modal" />);
jest.mock('components/DashboardRouter', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-dashboard-router" />
}));
jest.mock('components/DonationPageRouter', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-donation-page-router" />
}));
jest.mock('components/PortalRouter', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-portal-router" />
}));

function tree() {
  return render(<MainLayout />);
}

describe('MainLayout', () => {
  const isContributorAppPathMock = jest.mocked(isContributorAppPath);
  const isPortalAppPathMock = jest.mocked(isPortalAppPath);
  const useSubdomainMock = jest.mocked(useSubdomain);

  beforeEach(() => {
    isContributorAppPathMock.mockReturnValue(false);
    isPortalAppPathMock.mockReturnValue(false);
    useSubdomainMock.mockReturnValue('');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render nested components (Global Confirmation Modal -> Suspense -> Router)', () => {
    tree();

    expect(
      within(within(screen.getByTestId('mock-global-confirmation-modal')).getByTestId('mock-suspense')).getByTestId(
        'mock-dashboard-router'
      )
    ).toBeInTheDocument();
  });

  describe('DashboardRouter', () => {
    it('should render DashboardRouter', () => {
      tree();

      expect(screen.getByTestId('mock-dashboard-router')).toBeInTheDocument();
    });

    it('should render DashboardRouter when isContributorAppPath is true', () => {
      isContributorAppPathMock.mockReturnValue(true);

      tree();

      expect(screen.getByTestId('mock-dashboard-router')).toBeInTheDocument();
    });

    it('should not render DashboardRouter when isPortalAppPath is true', () => {
      isPortalAppPathMock.mockReturnValue(true);

      tree();

      expect(screen.queryByTestId('mock-dashboard-router')).not.toBeInTheDocument();
    });
  });

  describe('DonationPageRouter', () => {
    it('should render DonationPageRouter', () => {
      useSubdomainMock.mockReturnValue('donate');

      tree();

      expect(screen.getByTestId('mock-donation-page-router')).toBeInTheDocument();
    });

    it.each(['', 'www', 'support'])(
      'should not render DonationPageRouter when subdomain is in DASHBOARD_SUBDOMAINS (%s)',
      (subdomain) => {
        useSubdomainMock.mockReturnValue(subdomain);

        tree();

        expect(screen.queryByTestId('mock-donation-page-router')).not.toBeInTheDocument();
      }
    );

    it('should not render DonationPageRouter when isContributorAppPath is true', () => {
      isContributorAppPathMock.mockReturnValue(true);

      tree();

      expect(screen.queryByTestId('mock-donation-page-router')).not.toBeInTheDocument();
    });

    it('should not render DonationPageRouter when isPortalAppPath is true', () => {
      isPortalAppPathMock.mockReturnValue(true);

      tree();

      expect(screen.queryByTestId('mock-donation-page-router')).not.toBeInTheDocument();
    });
  });

  describe('PortalRouter', () => {
    it('should render PortalRouter', () => {
      isPortalAppPathMock.mockReturnValue(true);

      tree();

      expect(screen.getByTestId('mock-portal-router')).toBeInTheDocument();
    });

    it('should not render PortalRouter when isContributorAppPath is true', () => {
      isContributorAppPathMock.mockReturnValue(true);

      tree();

      expect(screen.queryByTestId('mock-portal-router')).not.toBeInTheDocument();
    });

    it('should not render PortalRouter when isPortalAppPath is false', () => {
      isPortalAppPathMock.mockReturnValue(false);

      tree();

      expect(screen.queryByTestId('mock-portal-router')).not.toBeInTheDocument();
    });
  });
});
