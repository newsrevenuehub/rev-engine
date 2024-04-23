import MockAdapter from 'axios-mock-adapter';
import { axe } from 'jest-axe';
import { render, screen, waitFor } from 'test-utils';
import Axios from 'ajax/axios';
import PaymentSuccess from './PaymentSuccess';
import { AnalyticsContext, UseAnalyticsContextResult } from 'components/analytics/AnalyticsContext';
import { useHistory, useLocation } from 'react-router-dom';
import { HUB_GA_V3_ID } from 'appSettings';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: jest.fn(),
  useLocation: jest.fn()
}));
jest.mock('components/common/GlobalLoading/GlobalLoading');

const page = {
  revenue_program: {
    facebook_pixel_id: 'mock-fb-pixel-id',
    google_analytics_v3_domain: 'mock-ga3-domain',
    google_analytics_v3_id: 'mock-ga3-id',
    google_analytics_v4_id: 'mock-ga4-id'
  },
  slug: 'mock-page-slug'
};

function tree(analyticsContext: Partial<UseAnalyticsContextResult> = {}) {
  return render(
    <AnalyticsContext.Provider
      value={{
        analyticsInstance: null,
        setAnalyticsConfig: jest.fn(),
        trackConversion: jest.fn(),
        ...analyticsContext
      }}
    >
      <PaymentSuccess />
    </AnalyticsContext.Provider>
  );
}

describe('PaymentSuccess', () => {
  const axiosMock = new MockAdapter(Axios);
  const useHistoryMock = jest.mocked(useHistory);
  const useLocationMock = jest.mocked(useLocation);
  let search: URL;

  beforeEach(() => {
    axiosMock.onGet('pages/live-detail/').reply(200, page);
    search = new URL('https://fundjournalism.org');
    search.searchParams.append('amount', '123.45');
    search.searchParams.append('email', 'mock-email');
    search.searchParams.append('frequency', 'mock-frequency');
    search.searchParams.append('pageSlug', 'mock-page-slug');
    search.searchParams.append('rpSlug', 'mock-rp-slug');
    search.searchParams.append('uid', 'mock-uid');
    useHistoryMock.mockReturnValue({ push: jest.fn(), replace: jest.fn() });
    useLocationMock.mockReturnValue({ search: '?pageSlug=mock-page-slug&rpSlug=mock-rp-slug' });
  });

  afterEach(() => {
    axiosMock.reset();
  });

  afterAll(() => axiosMock.restore());

  it('shows a loading spinner', async () => {
    tree();
    expect(screen.getByTestId('mock-global-loading')).toBeInTheDocument();

    // Let the pending update complete.
    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
  });

  it('fetches live page detail based on the page and revenue program slug', async () => {
    tree();
    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    expect(axiosMock.history.get[0]).toEqual(
      expect.objectContaining({
        params: {
          page: 'mock-page-slug',
          revenue_program: 'mock-rp-slug'
        },
        url: 'pages/live-detail/'
      })
    );
  });

  it('does not fetch anything if the page and revenue slug are not available', async () => {
    useLocationMock.mockReturnValue({ search: '' });
    tree();
    await Promise.resolve();
    expect(axiosMock.history.get.length).toBe(0);
  });

  it('logs a warning if fetching page detail fails', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    axiosMock.onGet('pages/live-detail/').networkError();
    tree();
    expect(warnSpy).not.toBeCalled();
    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    expect(warnSpy).toBeCalledTimes(1);
    warnSpy.mockRestore();
  });

  describe('Once page detail has been fetched successfully', () => {
    it('configures analytics with the Hub and revenue program config', async () => {
      const setAnalyticsConfig = jest.fn();

      tree({ setAnalyticsConfig });
      await waitFor(() => expect(setAnalyticsConfig).toBeCalled());
      expect(setAnalyticsConfig.mock.calls).toEqual([
        [
          {
            hubGaV3Id: HUB_GA_V3_ID,
            orgFbPixelId: 'mock-fb-pixel-id',
            orgGaV3Domain: 'mock-ga3-domain',
            orgGaV3Id: 'mock-ga3-id',
            orgGaV4Id: 'mock-ga4-id'
          }
        ]
      ]);
    });

    it('tracks a conversion after analytics have been configured', async () => {
      const trackConversion = jest.fn();
      const on = jest.fn();

      useLocationMock.mockReturnValue({ search: '?amount=123.45&pageSlug=mock-page-slug&rpSlug=mock-rp-slug' });

      tree({ trackConversion, analyticsInstance: { on } } as any);
      await waitFor(() => expect(on).toBeCalled());
      expect(on.mock.calls[0][0]).toBe('ready');
      on.mock.calls[0][1]();

      // Amount is in the query string we mock in this test.
      expect(trackConversion.mock.calls).toEqual([['123.45']]);
    });

    it('sends the user to the next URL with amount, frequency, and UID params if that is configured in the URL query string', async () => {
      const assignSpy = jest.spyOn(window.location, 'assign');
      const on = jest.fn();
      const replace = jest.fn();

      search.searchParams.append('next', 'https://mock-next-url.org/somewhere');
      useHistoryMock.mockReturnValue({ replace });
      useLocationMock.mockReturnValue({ search: search.search });
      tree({ analyticsInstance: { on } } as any);
      await waitFor(() => expect(on).toBeCalled());
      expect(assignSpy).not.toBeCalled();
      on.mock.calls[0][1]();
      expect(assignSpy.mock.calls).toEqual([
        ['https://mock-next-url.org/somewhere?uid=mock-uid&frequency=mock-frequency&amount=123.45']
      ]);
    });

    it('sends the user to the generic thank you page if a next URL is not configured in the URL query string', async () => {
      const on = jest.fn();
      const push = jest.fn();

      useHistoryMock.mockReturnValue({ push });
      useLocationMock.mockReturnValue({ search: search.search });
      tree({ analyticsInstance: { on } as any });
      await waitFor(() => expect(on).toBeCalled());
      on.mock.calls[0][1]();
      expect(push.mock.calls).toEqual([
        [
          {
            pathname: '/thank-you/',
            state: {
              page,
              amount: '123.45',
              donationPageUrl: `${window.location.origin}/${page.slug}/`,
              email: 'mock-email',
              frequencyText: 'mock-frequency'
            }
          }
        ]
      ]);
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
