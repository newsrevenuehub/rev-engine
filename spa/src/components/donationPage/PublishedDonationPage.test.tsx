import { render, screen, within } from '@testing-library/react';
import { Helmet } from 'react-helmet';
import { useParams } from 'react-router-dom';
import { HUB_RECAPTCHA_API_KEY, HUB_GA_V3_ID } from 'appSettings';
import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';
import { usePublishedPage } from 'hooks/usePublishedPage';
import useWebFonts from 'hooks/useWebFonts';
import PublishedDonationPage from './PublishedDonationPage';
import { getRevenueProgramSlug } from 'utilities/getRevenueProgramSlug';

jest.mock('react-google-recaptcha-v3', () => ({
  // This package doesn't seem to publish its props type.
  GoogleReCaptchaProvider: (props: any) => (
    <div
      data-testid="mock-google-recaptcha-provider"
      data-key={props.reCaptchaKey}
      data-script-props={JSON.stringify(props.scriptProps)}
    >
      {props.children}
    </div>
  )
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn()
}));
jest.mock('components/analytics/AnalyticsContext');
jest.mock('components/common/GlobalLoading/GlobalLoading');
jest.mock('hooks/usePublishedPage');
jest.mock('utilities/getRevenueProgramSlug');
jest.mock('hooks/useWebFonts');
jest.mock('components/common/PageError/PageError', () => () => <div data-testid="mock-page-error"></div>);
jest.mock('components/donationPage/ContributionPageI18nProvider');
jest.mock('components/donationPage/DonationPage');

function tree() {
  return render(<PublishedDonationPage />);
}

const mockPage = {
  revenue_program: {
    name: 'mock-rp-name',
    google_analytics_v3_id: 'mock-ga-v3-id',
    google_analytics_v3_domain: 'mock-ga-v3-domain',
    google_analytics_v4_id: 'mock-ga-v4-id',
    facebook_pixel_id: 'mock-fb-pixel-id'
  },
  styles: {
    font: {}
  }
} as any;

describe('PublishedDonationPage', () => {
  const useAnalyticsContextMock = jest.mocked(useAnalyticsContext);
  const useParamsMock = jest.mocked(useParams);
  const usePublishedPageMock = jest.mocked(usePublishedPage);
  const getRevenueProgramSlugMock = jest.mocked(getRevenueProgramSlug);
  const useWebFontsMock = jest.mocked(useWebFonts);

  beforeEach(() => {
    (window as any).csp_nonce = 'mock-nonce';
    useAnalyticsContextMock.mockReturnValue({
      setAnalyticsConfig: jest.fn(),
      analyticsInstance: null,
      trackConversion: jest.fn()
    });
    useParamsMock.mockReturnValue({ pageSlug: 'mock-page-slug' });
    usePublishedPageMock.mockReturnValue({
      error: undefined,
      isError: false,
      isLoading: false,
      page: mockPage,
      isFetched: true
    });
    getRevenueProgramSlugMock.mockReturnValue('mock-rp-slug');
  });

  afterAll(() => {
    delete (window as any).csp_nonce;
  });

  it('loads the contribution page based on subdomain and route params', () => {
    tree();
    expect(usePublishedPageMock.mock.calls).toEqual([['mock-rp-slug', 'mock-page-slug']]);
  });

  it('displays a spinner while loading the page', () => {
    usePublishedPageMock.mockReturnValue({
      error: undefined,
      isError: false,
      isLoading: true,
      page: undefined,
      isFetched: false
    });
    tree();
    expect(screen.getByTestId('mock-global-loading')).toBeInTheDocument();
  });

  describe('When the page is fetched', () => {
    it("doesn't show a spinner", () => {
      tree();
      expect(screen.queryByTestId('mock-global-loading')).not.toBeInTheDocument();
    });

    it("doesn't show a 404 message", () => {
      tree();
      expect(screen.queryByTestId('mock-page-error')).not.toBeInTheDocument();
    });

    it('shows the page wrapped in an i18next provider in live mode', () => {
      tree();

      const i18nProvider = screen.getByTestId('mock-contribution-page-i18n-provider');

      expect(i18nProvider).toBeInTheDocument();

      const page = within(i18nProvider).getByTestId('mock-donation-page');

      expect(page).toBeInTheDocument();
      expect(page.dataset.live).toBe('true');
      expect(page.dataset.page).toBe(JSON.stringify(mockPage));
    });

    it('sets the page title based on the revenue program name', () => {
      tree();

      const { title } = Helmet.peek();

      expect(title).toBe('common.joinRevenueProgram{"name":"mock-rp-name"}');
    });

    it('sets up web fonts for the page', () => {
      tree();
      expect(useWebFontsMock.mock.calls).toEqual([[mockPage.styles.font]]);
    });

    it("doesn't crash if no styles are defined on the page", () => {
      usePublishedPageMock.mockReturnValue({
        error: undefined,
        isError: false,
        isLoading: false,
        isFetched: false,
        page: { ...mockPage, styles: undefined }
      });
      tree();
      expect(useWebFontsMock.mock.calls).toEqual([[undefined]]);
    });

    it('sets up analytics for the page', () => {
      const setAnalyticsConfig = jest.fn();

      useAnalyticsContextMock.mockReturnValue({
        setAnalyticsConfig,
        analyticsInstance: null,
        trackConversion: jest.fn()
      });
      tree();
      expect(setAnalyticsConfig.mock.calls).toEqual([
        [
          {
            hubGaV3Id: HUB_GA_V3_ID,
            orgGaV3Id: 'mock-ga-v3-id',
            orgGaV3Domain: 'mock-ga-v3-domain',
            orgGaV4Id: 'mock-ga-v4-id',
            orgFbPixelId: 'mock-fb-pixel-id'
          }
        ]
      ]);
    });

    it('sets up Google ReCAPTCHA for the page with key and CSP nonce', () => {
      tree();

      const recaptchaProvider = screen.getByTestId('mock-google-recaptcha-provider');

      expect(recaptchaProvider.dataset.key).toBe(HUB_RECAPTCHA_API_KEY);
      expect(recaptchaProvider.dataset.scriptProps).toBe(JSON.stringify({ nonce: 'mock-nonce' }));
    });

    describe('But the page has no revenue_program property', () => {
      it('shows a 404 message', () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const noRpPage = { ...mockPage };

        delete noRpPage.revenue_program;
        usePublishedPageMock.mockReturnValue({
          error: undefined,
          isError: false,
          isLoading: false,
          page: noRpPage,
          isFetched: true
        });
        tree();
        expect(screen.getByTestId('mock-page-error')).toBeInTheDocument();
        errorSpy.mockRestore();
      });
    });
  });

  describe('If fetching the page fails', () => {
    beforeEach(() => {
      usePublishedPageMock.mockReturnValue({
        error: new Error(),
        isError: true,
        isLoading: false,
        isFetched: true,
        page: undefined
      });
    });

    it('shows a 404 message', () => {
      tree();
      expect(screen.getByTestId('mock-page-error')).toBeInTheDocument();
    });

    it("doesn't show a spinner", () => {
      tree();
      expect(screen.queryByTestId('mock-global-loading')).not.toBeInTheDocument();
    });
  });
});
