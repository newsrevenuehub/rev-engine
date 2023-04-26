import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import GenericThankYou from './GenericThankYou';
import { useLocation } from 'react-router-dom';
import * as AnalyticsContext from 'components/analytics/AnalyticsContext';
import { HUB_GA_V3_ID } from 'appSettings';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Redirect({ to }: { to: string }) {
    return <div data-testid="mock-redirect">{to}</div>;
  },
  useLocation: jest.fn()
}));
jest.mock('../../DonationPageFooter/DonationPageFooter');
jest.mock('../PostContributionSharing/PostContributionSharing');

function tree() {
  return render(<GenericThankYou />);
}

const mockState = {
  amount: 123.45,
  donationPageUrl: 'mock-donation-page-url',
  email: 'mock-email',
  frequencyText: 'mock-freq-text',
  page: {
    revenue_program: {
      name: 'mock-rp-name'
    }
  }
};

describe('GenericThankYou', () => {
  const useLocationMock = jest.mocked(useLocation);

  beforeEach(() => useLocationMock.mockReturnValue({ state: mockState }));

  it.each([['amount'], ['donationPageUrl'], ['email'], ['frequencyText'], ['page']])(
    'redirects up a directory if %s is missing in location state',
    (key) => {
      useLocationMock.mockReturnValue({ state: { ...mockState, [key]: undefined } });
      tree();
      expect(screen.getByTestId('mock-redirect')).toHaveTextContent('../');
    }
  );

  describe('When needed state is present in the location', () => {
    it('configures analytics with the Hub and revenue program properties', () => {
      useLocationMock.mockReturnValue({
        state: {
          ...mockState,
          page: {
            revenue_program: {
              facebook_pixel_id: 'test-fb-pixel-id',
              google_analytics_v3_domain: 'test-ga3-domain',
              google_analytics_v3_id: 'test-ga3-id',
              google_analytics_v4_id: 'test-ga4-id',
              name: 'mock-rp-name'
            },
            revenue_program_is_nonprofit: false
          }
        }
      });

      // This spy approach is needed because of problems mocking this context.
      // When we do this, GenericThankYou sees the mock but this test file
      // doesn't, possibly because we're using the component in test-utils.

      const setAnalyticsConfig = jest.fn();

      const contextSpy = jest.spyOn(AnalyticsContext, 'useAnalyticsContext').mockReturnValue({
        analyticsInstance: null,
        setAnalyticsConfig,
        trackConversion: jest.fn()
      });

      tree();
      expect(setAnalyticsConfig.mock.calls).toEqual([
        [
          {
            hubGaV3Id: HUB_GA_V3_ID,
            orgFbPixelId: 'test-fb-pixel-id',
            orgGaV3Domain: 'test-ga3-domain',
            orgGaV3Id: 'test-ga3-id',
            orgGaV4Id: 'test-ga4-id'
          }
        ]
      ]);
      contextSpy.mockRestore();
    });

    it('shows the donation page navbar', () => {
      tree();
      expect(screen.getByTestId('s-header-bar')).toBeInTheDocument();
    });

    it('shows the donation page footer', () => {
      tree();
      expect(screen.getByTestId('mock-donation-page-footer').dataset.pageRevenueProgramName).toBe('mock-rp-name');
    });

    it('shows text describing the contribution', () => {
      tree();
      expect(screen.getByTestId('contribution')).toHaveTextContent(
        'Your mock-freq-text contribution of $123.45 to mock-rp-name has been received.'
      );
    });

    it('shows text describing the receipt sent', () => {
      tree();
      expect(screen.getByTestId('receipt')).toHaveTextContent('A receipt will be sent to mock-email shortly.');
    });

    it('shows text explaining the contribution is tax-deductible if the revenue program is nonprofit', () => {
      useLocationMock.mockReturnValue({
        state: {
          ...mockState,
          page: {
            revenue_program: {
              name: 'mock-rp-name'
            },
            revenue_program_is_nonprofit: true
          }
        }
      });
      tree();
      expect(screen.getByText('Contributions or gifts to mock-rp-name are tax deductible.')).toBeVisible();
    });

    it("doesn't show text explaining the contribution is tax-deductible if the revenue program is not nonprofit", () => {
      useLocationMock.mockReturnValue({
        state: {
          ...mockState,
          page: {
            revenue_program: {
              name: 'mock-rp-name'
            },
            revenue_program_is_nonprofit: false
          }
        }
      });
      tree();
      expect(screen.queryByText('Contributions or gifts to mock-rp-name are tax deductible.')).not.toBeInTheDocument();
    });

    it('shows post-contribution sharing options', () => {
      tree();

      const sharing = screen.getByTestId('mock-post-contribution-sharing');

      expect(sharing.dataset.donationPageUrl).toBe('mock-donation-page-url');
      expect(sharing.dataset.revenueProgramName).toBe('mock-rp-name');
    });

    it('shows a link to the post-thank-you redirect if defined', () => {
      useLocationMock.mockReturnValue({
        state: {
          ...mockState,
          page: {
            post_thank_you_redirect: 'mock-post-thank-you-redirect',
            revenue_program: {
              name: 'mock-rp-name'
            }
          }
        }
      });
      tree();
      expect(screen.getByRole('link', { name: 'Return to website' })).toHaveAttribute(
        'href',
        'mock-post-thank-you-redirect'
      );
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
