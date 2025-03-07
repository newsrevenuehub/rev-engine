import Axios from 'ajax/axios';
import { LIVE_PAGE_DETAIL } from 'ajax/endpoints';
import MockAdapter from 'axios-mock-adapter';
import { useConfigureAnalytics } from 'components/analytics';
import useWebFonts from 'hooks/useWebFonts';
import { render, screen, waitFor } from 'test-utils';
import PortalPage, { PortalPageProps } from './PortalPage';

jest.mock('components/analytics/TrackPageView', () => ({ children }: { children: React.ReactNode }) => (
  <div data-testid="mock-track-page-view">{children}</div>
));
jest.mock('notistack', () => ({
  ...jest.requireActual('notistack'),
  useSnackbar: () => ({ enqueueSnackbar: jest.fn() })
}));
jest.mock('components/analytics');
jest.mock('hooks/useWebFonts');
jest.mock('utilities/getRevenueProgramSlug');
jest.mock('components/donationPage/DonationPageHeader/DonationPageHeader');
jest.mock('components/donationPage/SegregatedStyles', () => ({ children }: { children: React.ReactNode }) => (
  <div data-testid="mock-segregated-styles">{children}</div>
));

const page = {
  styles: {
    font: 'mock-font'
  },
  revenue_program: {
    default_donation_page: '123',
    organization: {
      plan: {
        name: 'CORE'
      }
    }
  }
};

describe('PortalPage', () => {
  const useConfigureAnalyticsMock = useConfigureAnalytics as jest.Mock;
  const axiosMock = new MockAdapter(Axios);

  beforeEach(() => {
    axiosMock.onGet(LIVE_PAGE_DETAIL).reply(200, page);
  });
  afterEach(() => axiosMock.reset());
  afterAll(() => axiosMock.restore());

  function tree(props?: PortalPageProps) {
    return render(
      <PortalPage {...props}>
        <div data-testid="mock-content-component" />
      </PortalPage>
    );
  }

  it('configures analytics', () => {
    tree();
    expect(useConfigureAnalyticsMock).toBeCalledTimes(1);
  });

  it('puts the className prop on its container', async () => {
    tree({ className: 'test-class-name' });
    await screen.findByTestId('mock-track-page-view');
    expect(document.body.querySelector('.test-class-name')).toBeInTheDocument();
  });

  const assertContentIsRendered = async () => {
    await screen.findByTestId('mock-track-page-view');
    expect(screen.getByTestId('mock-segregated-styles')).toBeInTheDocument();
    expect(screen.getByText('Powered by')).toBeVisible();
    expect(screen.getByRole('link', { name: 'News Revenue Engine' })).toBeVisible();
  };

  it('should have expected default appearance and initial state', async () => {
    tree();
    await assertContentIsRendered();
    expect(screen.getByTestId('mock-content-component')).toBeInTheDocument();
    expect(screen.getByTestId('mock-donation-page-header')).toBeInTheDocument();
  });

  it('should call useWebFonts with page styles font', async () => {
    tree();
    await waitFor(() => expect(useWebFonts).toHaveBeenCalledTimes(1));
    expect(useWebFonts).toHaveBeenCalledWith(page.styles.font);
  });

  describe('should render NRE logo header', () => {
    it('when page is undefined', () => {
      axiosMock.onGet(LIVE_PAGE_DETAIL).reply(200, null);
      tree();
      expect(screen.getByRole('link', { name: 'News Revenue Engine' })).toBeVisible();
    });

    it('when no default donation page', () => {
      axiosMock.onGet(LIVE_PAGE_DETAIL).reply(200, {
        ...page,
        revenue_program: {
          ...page.revenue_program,
          default_donation_page: null
        }
      });
      tree();
      expect(screen.getByRole('link', { name: 'News Revenue Engine' })).toBeVisible();
    });

    it('when org plan is FREE', () => {
      axiosMock.onGet(LIVE_PAGE_DETAIL).reply(200, {
        ...page,
        revenue_program: {
          ...page.revenue_program,
          organization: {
            ...page.revenue_program.organization,
            plan: {
              name: 'FREE'
            }
          }
        }
      });
      tree();
      expect(screen.getByRole('link', { name: 'News Revenue Engine' })).toBeVisible();
    });
  });

  it('NRE logo should link to Home page', () => {
    tree();
    const link = screen.getByRole('link', { name: 'News Revenue Engine' });
    expect(link).toHaveAttribute('href', 'https://fundjournalism.org/');
    expect(link).toHaveAttribute('target', '_blank');
  });

  // TODO: fix this test block. Axios issues
  describe('request errors', () => {
    // Empty test to make axios fail request. Has to be first test inside this describe block
    it('fail test setup', () => {
      axiosMock.onGet(LIVE_PAGE_DETAIL).timeout();
      tree();
      expect(true).toBe(true);
    });

    it('should render generic error when timeout', async () => {
      axiosMock.onGet(LIVE_PAGE_DETAIL).timeout();
      jest.spyOn(console, 'error').mockImplementation(() => {});
      tree();
      await assertContentIsRendered();
      expect(screen.getByTestId('page-error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong. Please try again later.')).toBeInTheDocument();
    });

    it('should render generic error when network error', async () => {
      axiosMock.onGet(LIVE_PAGE_DETAIL).networkError();
      jest.spyOn(console, 'error').mockImplementation(() => {});
      tree();
      await assertContentIsRendered();
      expect(screen.getByTestId('page-error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong. Please try again later.')).toBeInTheDocument();
    });

    it('should render generic error when internal server error', async () => {
      axiosMock.onGet(LIVE_PAGE_DETAIL).reply(500);
      jest.spyOn(console, 'error').mockImplementation(() => {});
      tree();
      await assertContentIsRendered();
      expect(screen.getByTestId('page-error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong. Please try again later.')).toBeInTheDocument();
    });

    it('should render 404 if page is not found', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      axiosMock.onGet(LIVE_PAGE_DETAIL).reply(404);
      tree();
      await screen.findByTestId('mock-track-page-view');
      expect(screen.getByTestId('page-error')).toBeInTheDocument();
    });
  });
});
