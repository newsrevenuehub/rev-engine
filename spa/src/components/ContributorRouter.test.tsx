import { render, screen, within } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { ComponentType } from 'react';
import { Router } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { revEngineTheme } from 'styles/themes';
import ContributorRouter from './ContributorRouter';
import useWebFonts from 'hooks/useWebFonts';
import useRequest from 'hooks/useRequest';
import isAuthenticated from 'utilities/isAuthenticated';
import useSubdomain from 'hooks/useSubdomain';
import { PageType } from 'constants/propTypes';

jest.mock('utilities/isAuthenticated');
jest.mock('hooks/useWebFonts');
jest.mock('hooks/useRequest');
jest.mock('hooks/useSubdomain');

// Turn <BrowserRouter> into a no-op component so we can use our own router.
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock TrackPageView as a passthrough.
jest.mock('components/analytics/TrackPageView', () => ({ component }: { component: ComponentType }) => {
  const Component = component;

  return (
    <div data-testid="mock-track-page-view">
      <Component />
    </div>
  );
});

// Mock SegregatedStyles as a passthrough.
jest.mock(
  'components/donationPage/SegregatedStyles',
  () =>
    ({ children, page }: { children: React.ReactNode; page?: PageType }) => {
      return (
        <div data-testid="mock-segregated-styles">
          <div data-testid="page-data">{JSON.stringify(page)}</div>
          {children}
        </div>
      );
    }
);

// Mock routes. We programmatically mock GenericThankYou so we can have it throw an error to test that.
jest.mock('components/contributor/contributorDashboard/ContributorDashboard', () => () => (
  <div data-testid="mock-contributor-dashboard" />
));
jest.mock('components/contributor/ContributorEntry', () => () => <div data-testid="mock-contributor-entry" />);
jest.mock('components/contributor/ContributorVerify', () => () => <div data-testid="mock-contributor-verify" />);

function tree(path?: string) {
  const history = createMemoryHistory({ initialEntries: [path ?? ''] });

  return {
    ...render(
      <Router history={history}>
        <ThemeProvider theme={revEngineTheme}>
          <ContributorRouter />
        </ThemeProvider>
      </Router>
    ),
    history
  };
}

const mockData = {
  styles: {
    font: 'mock-font'
  },
  revenue_program: {
    default_donation_page: null,
    organization: {
      plan: {
        name: 'FREE'
      }
    }
  }
} as PageType;

describe('ContributorRouter', () => {
  const useSubdomainMock = jest.mocked(useSubdomain);
  const useRequestMock = jest.mocked(useRequest);
  const isAuthenticatedMock = jest.mocked(isAuthenticated);

  beforeEach(() => {
    isAuthenticatedMock.mockReturnValue(true);
    useSubdomainMock.mockReturnValue('mock-subdomain');
    useRequestMock.mockImplementation(
      () =>
        (_: any, { onSuccess }: { onSuccess: ({ data }: { data: PageType }) => void }) =>
          onSuccess({ data: mockData })
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Routes in tests below are hard-coded to avoid a situation where slashes
  // change in our route config, and we accidentally route to URLs like
  // /donate//thank-you but tests continue to pass.

  it('displays a tracked ContributorDashboard at /contributor/contributions/', async () => {
    tree('/contributor/contributions/');
    await screen.findByTestId('mock-contributor-dashboard');
    expect(
      within(screen.getByTestId('mock-track-page-view')).getByTestId('mock-contributor-dashboard')
    ).toBeInTheDocument();
  });

  it('displays a tracked ContributorEntry at /contributor/', async () => {
    tree('/contributor/');
    await screen.findByTestId('mock-contributor-entry');
    expect(
      within(screen.getByTestId('mock-track-page-view')).getByTestId('mock-contributor-entry')
    ).toBeInTheDocument();
  });

  it('displays a tracked ContributorVerify at /contributor-verify/', async () => {
    tree('/contributor-verify/');
    await screen.findByTestId('mock-contributor-verify');
    expect(
      within(screen.getByTestId('mock-track-page-view')).getByTestId('mock-contributor-verify')
    ).toBeInTheDocument();
  });

  it('renders nothing when: subdomain is not set + no page data + fetchedPageData = false', () => {
    useRequestMock.mockImplementation(() => (_: any) => {});
    tree();
    expect(screen.queryByTestId('mock-segregated-styles')).not.toBeInTheDocument();
  });

  describe.each([['CORE'], ['FREE'], ['PLUS']])('For the %s plan', (plan) => {
    // eslint-disable-next-line jest/valid-title
    describe.each([true, false])('', (hasDefaultDonationPage) => {
      it(`${hasDefaultDonationPage ? 'if RP has' : 'if RP does not have'} "default_donation_page" use ${
        plan !== 'FREE' && hasDefaultDonationPage ? 'CUSTOM' : 'DEFAULT'
      } style`, () => {
        const mockCustomData = {
          styles: {
            font: 'mock-font'
          },
          revenue_program: {
            default_donation_page: hasDefaultDonationPage ? { id: 'mock-id' } : null,
            organization: {
              plan: {
                name: plan
              }
            }
          }
        };
        useRequestMock.mockImplementation(
          () =>
            (_: any, { onSuccess }: { onSuccess: ({ data }: { data: any }) => void }) =>
              onSuccess({ data: mockCustomData })
        );
        tree();
        expect.assertions(1);
        if (plan !== 'FREE' && hasDefaultDonationPage) {
          // eslint-disable-next-line jest/no-conditional-expect
          expect(screen.getByTestId('page-data')).toHaveTextContent(JSON.stringify(mockCustomData));
        } else {
          // eslint-disable-next-line jest/no-conditional-expect
          expect(screen.getByTestId('page-data')).toHaveTextContent('false');
        }
      });
    });
  });

  describe('useWebFonts', () => {
    it('calls with undefined', () => {
      useRequestMock.mockImplementation(() => (_: any) => {});
      tree();
      expect(useWebFonts).toHaveBeenCalled();
      expect(useWebFonts).toHaveBeenLastCalledWith(undefined);
    });

    it('calls with page style', () => {
      tree();
      expect(useWebFonts).toHaveBeenCalled();
      expect(useWebFonts).toHaveBeenLastCalledWith(mockData.styles.font);
    });
  });
});
