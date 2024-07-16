import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { revEngineTheme } from 'styles/themes';
import { act, render, screen, within } from 'test-utils';
import ContributorRouter from './ContributorRouter';
import useWebFonts from 'hooks/useWebFonts';
import useRequest from 'hooks/useRequest';
import isAuthenticated from 'utilities/isAuthenticated';
import { ContributionPage } from 'hooks/useContributionPage';
import { Suspense } from 'react';

jest.mock('utilities/getRevenueProgramSlug');
jest.mock('utilities/isAuthenticated');
jest.mock('hooks/useWebFonts');
jest.mock('hooks/useRequest');

// Turn <BrowserRouter> into a no-op component so we can use our own router.
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock TrackPageView as a passthrough.
jest.mock('components/analytics/TrackPageView', () => ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="mock-track-page-view">{children}</div>;
});

// Mock SegregatedStyles as a passthrough.
jest.mock(
  'components/donationPage/SegregatedStyles',
  () =>
    ({ children, page }: { children: React.ReactNode; page?: ContributionPage }) => {
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
          <Suspense fallback="loading">
            <ContributorRouter />
          </Suspense>
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
};

describe('ContributorRouter', () => {
  const useRequestMock = jest.mocked(useRequest);
  const isAuthenticatedMock = jest.mocked(isAuthenticated);

  beforeEach(() => {
    isAuthenticatedMock.mockReturnValue(true);
    useRequestMock.mockImplementation(
      () =>
        (_: any, { onSuccess }: { onSuccess: ({ data }: { data: any }) => void }) =>
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

  it('renders nothing when: subdomain is not set and page data has not been fetched yet', () => {
    useRequestMock.mockImplementation(() => () => {});
    tree();
    expect(screen.queryByTestId('mock-segregated-styles')).not.toBeInTheDocument();
  });

  it('renders normally when fetch pages fails', () => {
    useRequestMock.mockImplementation(
      () =>
        (_: any, { onFailure }: { onFailure: () => void }) =>
          onFailure()
    );
    tree('/contributor/');
    expect(screen.getByTestId('mock-contributor-entry')).toBeInTheDocument();
  });

  describe.each([
    ['CORE', { shouldUseCustomStyle: true }],
    ['FREE', { shouldUseCustomStyle: false }],
    ['PLUS', { shouldUseCustomStyle: true }]
  ])('For the %s plan', (plan, { shouldUseCustomStyle }) => {
    const mockDefaultData = {
      styles: {
        font: 'mock-font'
      },
      revenue_program: {
        default_donation_page: undefined,
        organization: {
          plan: {
            name: plan
          }
        }
      }
    };

    const mockCustomData = {
      ...mockDefaultData,
      revenue_program: {
        ...mockDefaultData.revenue_program,
        // Valid default_donation_page values are IDs (numbers).
        default_donation_page: 1
      }
    };

    if (shouldUseCustomStyle) {
      it("uses the RP's custom page style if it exists", () => {
        useRequestMock.mockImplementation(
          () =>
            (_: any, { onSuccess }: { onSuccess: ({ data }: { data: any }) => void }) =>
              onSuccess({ data: mockCustomData })
        );
        tree();
        expect(screen.getByTestId('page-data')).toHaveTextContent(JSON.stringify(mockCustomData));
      });
    } else {
      it('uses the default RevEngine style even if default_donation_page exists', () => {
        useRequestMock.mockImplementation(
          () =>
            (_: any, { onSuccess }: { onSuccess: ({ data }: { data: any }) => void }) =>
              onSuccess({ data: mockCustomData })
        );
        tree();
        expect(screen.getByTestId('page-data')).toHaveTextContent('false');
      });
    }

    it('uses the default RevEngine style if default_donation_page does not exists', () => {
      useRequestMock.mockImplementation(
        () =>
          (_: any, { onSuccess }: { onSuccess: ({ data }: { data: any }) => void }) =>
            onSuccess({ data: mockDefaultData })
      );
      tree();
      expect(screen.getByTestId('page-data')).toHaveTextContent('false');
    });
  });

  it('calls useWebFonts with the correct inputs before and after page loading', () => {
    jest.useFakeTimers();
    useRequestMock.mockImplementation(
      () =>
        (_: any, { onSuccess }: { onSuccess: ({ data }: { data: any }) => void }) =>
          setTimeout(() => onSuccess({ data: mockData }), 1000)
    );
    tree();
    expect(useWebFonts).toHaveBeenCalledWith(undefined);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(useWebFonts).toHaveBeenLastCalledWith(mockData.styles.font);
  });
});
