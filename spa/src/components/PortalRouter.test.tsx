import { render, screen, within } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { ComponentType } from 'react';
import { Router } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { revEngineTheme } from 'styles/themes';
import PortalRouter from './PortalRouter';

// Turn <BrowserRouter> into a no-op component so we can use our own router.

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Redirect: ({ to }: { to: string }) => <div data-testid="mock-redirect" data-to={to} />
}));

// Mock TrackPageView as a passthrough.

jest.mock('components/portal/PortalPage', () => ({ children }: { children: React.ReactNode }) => (
  <div data-testid="mock-portal-page">{children}</div>
));

jest.mock('components/authentication/ProtectedRoute', () => ({ render }: { render: () => React.ReactNode }) => (
  <div data-testid="mock-protected-router">{render()}</div>
));
jest.mock('components/portal/PortalEntry', () => () => <div data-testid="mock-portal-entry" />);
jest.mock('components/contributor/ContributorVerify', () => () => <div data-testid="mock-contributor-verify" />);
jest.mock('components/contributor/contributorDashboard/ContributorDashboard', () => () => (
  <div data-testid="mock-contributor-dashboard" />
));

function tree(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] });

  return {
    ...render(
      <Router history={history}>
        <ThemeProvider theme={revEngineTheme}>
          <PortalRouter />
        </ThemeProvider>
      </Router>
    ),
    history
  };
}

describe('PortalRouter', () => {
  // Routes in tests below are hard-coded to avoid a situation where slashes
  // change in our route config, and we accidentally route to URLs like
  // /portal//my-contributions but tests continue to pass.

  it('displays a PortalPage with PortalEntry at /portal/', async () => {
    tree('/portal/');
    await screen.findByTestId('mock-portal-entry');
    expect(within(screen.getByTestId('mock-portal-page')).getByTestId('mock-portal-entry')).toBeInTheDocument();
  });

  it('displays a PortalPage with ContributorDashboard at /portal/my-contributions/', async () => {
    tree('/portal/my-contributions/');
    await screen.findByTestId('mock-contributor-dashboard');
    expect(within(screen.getByTestId('mock-protected-router')).getByTestId('mock-portal-page')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('mock-portal-page')).getByTestId('mock-contributor-dashboard')
    ).toBeInTheDocument();
  });

  it('displays a PortalPage with ContributorVerify at /portal/verification/', async () => {
    tree('/portal/verification/');
    await screen.findByTestId('mock-contributor-verify');
    expect(within(screen.getByTestId('mock-portal-page')).getByTestId('mock-contributor-verify')).toBeInTheDocument();
  });

  it('redirects to /portal/ when no route matches', () => {
    tree('/portal/does-not-exist/');
    expect(screen.getByTestId('mock-redirect').dataset.to).toEqual('/portal/');
  });
});
