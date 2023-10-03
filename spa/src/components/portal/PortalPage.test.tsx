import Axios from 'ajax/axios';
import { LIVE_PAGE_DETAIL } from 'ajax/endpoints';
import MockAdapter from 'axios-mock-adapter';
import useWebFonts from 'hooks/useWebFonts';
import { render, screen, waitFor } from 'test-utils';
import PortalPage from './PortalPage';

jest.mock('components/analytics/TrackPageView', () => ({ children }: { children: React.ReactNode }) => (
  <div data-testid="mock-track-page-view">{children}</div>
));
jest.mock('notistack', () => ({
  ...jest.requireActual('notistack'),
  useSnackbar: () => ({ enqueueSnackbar: jest.fn() })
}));
jest.mock('hooks/useWebFonts');
jest.mock('hooks/useSubdomain', () => jest.fn(() => 'mock-subdomain'));
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
  const axiosMock = new MockAdapter(Axios);

  beforeEach(() => {
    axiosMock.onGet(LIVE_PAGE_DETAIL).reply(200, page);
  });

  afterEach(() => axiosMock.reset());

  afterAll(() => axiosMock.restore());

  function tree() {
    return render(
      <PortalPage>
        <div data-testid="mock-content-component" />
      </PortalPage>
    );
  }

  const assertContentIsRendered = async () => {
    await screen.findByTestId('mock-track-page-view');
    expect(screen.getByTestId('mock-segregated-styles')).toBeInTheDocument();
    expect(screen.getByTestId('mock-donation-page-header')).toBeInTheDocument();
    expect(screen.getByTestId('mock-content-component')).toBeInTheDocument();
    expect(screen.getByText('Powered by')).toBeVisible();
    expect(screen.getByRole('graphics-document', { name: 'News Revenue Engine logo' })).toBeVisible();
  };

  it('should have expected default appearance and initial state', async () => {
    tree();
    await assertContentIsRendered();
  });

  it('should render normally even if no page data', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    axiosMock.onGet(LIVE_PAGE_DETAIL).networkError();
    tree();
    await assertContentIsRendered();
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
      expect(screen.getByRole('graphics-document', { name: 'News Revenue Engine logo' })).toBeVisible();
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
      expect(screen.getByRole('graphics-document', { name: 'News Revenue Engine logo' })).toBeVisible();
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
      expect(screen.getByRole('graphics-document', { name: 'News Revenue Engine logo' })).toBeVisible();
    });
  });
});
