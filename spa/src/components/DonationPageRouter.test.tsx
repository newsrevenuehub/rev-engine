import { cleanup, render, screen, within } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { ComponentType } from 'react';
import { Router } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { revEngineTheme } from 'styles/themes';
import DonationPageRouter from './DonationPageRouter';
import GenericThankYou from 'components/donationPage/live/GenericThankYou';

// Turn <BrowserRouter> into a no-op component so we can use our own router.

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock TrackPageView as a passthrough.

jest.mock('components/analytics/TrackPageView', () => ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="mock-track-page-view">{children}</div>;
});

// Mock routes. We programmatically mock GenericThankYou so we can have it throw an error to test that.

jest.mock('components/donationPage/ExtraneousURLRedirect');

jest.mock('components/donationPage/live/GenericThankYou/GenericThankYou');

jest.mock('components/donationPage/LiveDonationPageContainer', () => () => (
  <div data-testid="mock-live-donation-page-container" />
));

jest.mock('components/donationPage/live/PaymentSuccess', () => () => <div data-testid="mock-payment-success" />);

function tree(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] });

  return {
    ...render(
      <Router history={history}>
        <ThemeProvider theme={revEngineTheme}>
          <DonationPageRouter />
        </ThemeProvider>
      </Router>
    ),
    history
  };
}

describe('DonationPageRouter', () => {
  const GenericThankYouMock = GenericThankYou as jest.Mock;

  beforeEach(() => GenericThankYouMock.mockReturnValue(<div data-testid="mock-generic-thank-you" />));

  // Routes in tests below are hard-coded to avoid a situation where slashes
  // change in our route config, and we accidentally route to URLs like
  // /donate//thank-you but tests continue to pass.

  it('displays a tracked GenericThankYou at /thank-you/', async () => {
    tree('/thank-you/');
    await screen.findByTestId('mock-generic-thank-you');
    expect(
      within(screen.getByTestId('mock-track-page-view')).getByTestId('mock-generic-thank-you')
    ).toBeInTheDocument();
  });

  it('displays a tracked GenericThankYou at /:pageSlug/thank-you/', async () => {
    tree('/donate/thank-you/');
    await screen.findByTestId('mock-generic-thank-you');
    expect(
      within(screen.getByTestId('mock-track-page-view')).getByTestId('mock-generic-thank-you')
    ).toBeInTheDocument();
  });

  it('displays an untracked PaymentSuccess at /payment/success/', async () => {
    tree('/payment/success/');
    await screen.findByTestId('mock-payment-success');
    expect(screen.getByTestId('mock-payment-success')).toBeInTheDocument();
  });

  it('displays a tracked LiveDonationPageContainer at /:pageSlug', async () => {
    tree('/donate/');
    await screen.findByTestId('mock-live-donation-page-container');
    expect(
      within(screen.getByTestId('mock-track-page-view')).getByTestId('mock-live-donation-page-container')
    ).toBeInTheDocument();
  });

  it.each([
    ['/:pageSlug/extra/', '/donate/extra/'],
    ['/:pageSlug/extra/extra/', '/donate/extra/extra/']
  ])('displays a tracked ExtraneousURLRedirect at %s', async (_, path) => {
    tree(path);
    await screen.findByTestId('mock-extraneous-url-redirect');
    expect(screen.getByTestId('mock-extraneous-url-redirect')).toBeInTheDocument();
  });

  it('displays a tracked LiveDonationPageContainer at /', async () => {
    tree('/');
    await screen.findByTestId('mock-live-donation-page-container');
    expect(
      within(screen.getByTestId('mock-track-page-view')).getByTestId('mock-live-donation-page-container')
    ).toBeInTheDocument();
  });

  it('adds trailing slashes to routes', async () => {
    const { history: donateHistory } = tree('/donate');

    expect(donateHistory.location.pathname).toBe('/donate/');
    cleanup();

    // Testing a second layer.

    const { history: thanksHistory } = tree('/donate/thank-you');

    expect(thanksHistory.location.pathname).toBe('/donate/thank-you/');
    cleanup();
  });

  it('shows an error message if a route throws an error', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    GenericThankYouMock.mockImplementation(() => {
      throw new Error('mock-error');
    });

    tree('/thank-you/');
    expect(screen.getByText("We've encountered a problem!")).toBeInTheDocument();
    errorSpy.mockRestore();
  });
});
