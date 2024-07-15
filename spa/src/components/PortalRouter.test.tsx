import { render, screen, within } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Suspense } from 'react';
import { Router } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { usePortalPendo } from 'hooks/usePortalPendo';
import { revEngineTheme } from 'styles/themes';
import PortalRouter from './PortalRouter';

jest.mock('hooks/usePortalPendo');

// Turn <BrowserRouter> into a no-op component so we can use our own router.
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({ search: '?mock=query' }),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Redirect: ({ to }: { to: string }) => <div data-testid="mock-redirect" data-to={JSON.stringify(to)} />
}));

// Mock SentryRoute as a passthrough.
jest.mock('hooks/useSentry', () => ({
  SentryRoute: ({ render, path }: { render: () => React.ReactNode; path: string }) => {
    return <div data-testid={`mock-sentry-route-${path}`}>{render()}</div>;
  }
}));

// Mock TrackPageView as a passthrough.
jest.mock('components/analytics/TrackPageView', () => ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="mock-track-page-view">{children}</div>;
});

jest.mock('components/portal/PortalPage');
jest.mock('components/authentication/ProtectedRoute', () => ({ render }: { render: () => React.ReactNode }) => (
  <div data-testid="mock-protected-router">{render()}</div>
));
jest.mock('components/portal/ContributionsList/ContributionsList', () => () => (
  <div data-testid="mock-contributions-list" />
));
jest.mock('components/portal/PortalEntry', () => () => <div data-testid="mock-portal-entry" />);
jest.mock('components/portal/TokenVerification/TokenVerification', () => () => (
  <div data-testid="mock-token-verification" />
));

function tree(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] });

  return {
    ...render(
      <Router history={history}>
        <ThemeProvider theme={revEngineTheme}>
          <Suspense fallback={'loading'}>
            <PortalRouter />
          </Suspense>
        </ThemeProvider>
      </Router>
    ),
    history
  };
}

describe('PortalRouter', () => {
  const usePortalPendoMock = jest.mocked(usePortalPendo);

  it('loads Pendo', () => {
    tree('/portal/');
    expect(usePortalPendoMock).toBeCalledTimes(1);
  });

  // Routes in tests below are hard-coded to avoid a situation where slashes
  // change in our route config, and we accidentally route to URLs like
  // /portal//my-contributions but tests continue to pass.

  it('displays a PortalPage with PortalEntry at /portal/', async () => {
    tree('/portal/');
    await screen.findByTestId('mock-portal-entry');
    expect(within(screen.getByTestId('mock-portal-page')).getByTestId('mock-portal-entry')).toBeInTheDocument();
  });

  it('displays ContributionsList at /portal/my-contributions/', async () => {
    tree('/portal/my-contributions/');
    await screen.findByTestId('mock-contributions-list');
    expect(
      within(screen.getByTestId('mock-protected-router')).getByTestId('mock-contributions-list')
    ).toBeInTheDocument();
  });

  it('displays ContributionsList at /portal/my-contributions/:contributionId/', async () => {
    tree('/portal/my-contributions/contribution-id/');
    await screen.findByTestId('mock-contributions-list');
    expect(
      within(screen.getByTestId('mock-protected-router')).getByTestId('mock-contributions-list')
    ).toBeInTheDocument();
  });

  it('displays a PortalPage with TokenVerification at /portal/verification/', async () => {
    tree('/portal/verification/');
    await screen.findByTestId('mock-token-verification');
    expect(within(screen.getByTestId('mock-portal-page')).getByTestId('mock-token-verification')).toBeInTheDocument();
  });

  it('redirects to /portal/ when no route matches', () => {
    tree('/portal/does-not-exist/');
    expect(screen.getByTestId('mock-redirect').dataset.to).toEqual(JSON.stringify('/portal/'));
  });

  describe('Legacy Contributor Portal', () => {
    it('track access at /contributor/contributions/', async () => {
      tree('/contributor/contributions/');

      expect(
        within(screen.getByTestId('mock-sentry-route-/contributor/contributions/')).getByTestId('mock-track-page-view')
      ).toBeInTheDocument();
    });

    it('track access at /contributor/', async () => {
      tree('/contributor/');

      expect(
        within(screen.getByTestId('mock-sentry-route-/contributor/')).getByTestId('mock-track-page-view')
      ).toBeInTheDocument();
    });

    it('track access at /contributor-verify/', async () => {
      tree('/contributor-verify/');

      expect(
        within(screen.getByTestId('mock-sentry-route-/contributor-verify/')).getByTestId('mock-track-page-view')
      ).toBeInTheDocument();
    });

    it.each([
      ['/contributor/contributions/', '/portal/my-contributions/', false],
      ['/contributor/', '/portal/', false],
      ['/contributor-verify/', '/portal/verification/', true]
    ])('redirects from %s to %s', (path, redirect, passQueryParams) => {
      tree(path);

      const to = passQueryParams ? { pathname: redirect, search: '?mock=query' } : redirect;

      expect(within(screen.getByTestId(`mock-sentry-route-${path}`)).getByTestId('mock-redirect')).toHaveAttribute(
        'data-to',
        JSON.stringify(to)
      );
    });
  });
});
