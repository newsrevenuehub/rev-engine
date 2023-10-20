import { render, screen, waitFor, within } from '@testing-library/react';
import { Helmet } from 'react-helmet';

import { useParams } from 'react-router-dom';
import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';
import useRequest from 'hooks/useRequest';

import LiveDonationPageContainer from './LiveDonationPageContainer';

jest.mock('hooks/useRequest', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('components/analytics/AnalyticsContext', () => ({
  __esModule: true,
  useAnalyticsContext: jest.fn()
}));

jest.mock('hooks/useSubdomain');
jest.mock('hooks/useWebFonts');

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn()
}));

jest.mock('components/common/LivePage404', () => () => {
  return <div data-testid="mock-live-page-404"></div>;
});

jest.mock('components/donationPage/DonationPage', () => ({ live, page }: { live: boolean; page: any }) => {
  return (
    <div data-testid="mock-donation-page">
      <div data-testid="live-prop">{live ? 'true' : 'false'}</div>
      {JSON.stringify(page)}
    </div>
  );
});

jest.mock('components/donationPage/live/LiveLoading', () => () => {
  return <div data-testid="mock-live-loading" />;
});

function tree() {
  return render(<LiveDonationPageContainer />);
}

const mockData = {
  revenue_program: {
    name: 'mock-rv-name',
    google_analytics_v3_id: 'mock-1',
    google_analytics_v3_domain: 'mock-2',
    google_analytics_v4_id: 'mock-3',
    facebook_pixel_id: 'mock-4'
  }
};

describe('LiveDonationPageContainer', () => {
  const useParamsMock = useParams as jest.Mock;
  const useAnalyticsContextMock = useAnalyticsContext as jest.Mock;
  const useRequestMock = useRequest as jest.Mock;

  it('should render custom title', async () => {
    useParamsMock.mockReturnValue({
      pageSlug: 'mock-page-slug'
    });
    useAnalyticsContextMock.mockReturnValue({
      setAnalyticsConfig: jest.fn()
    });
    useRequestMock.mockImplementation(
      () =>
        (_: any, { onSuccess }: { onSuccess: (any: any) => void }) =>
          onSuccess({ data: mockData })
    );
    tree();
    const helmet = Helmet.peek();
    expect(helmet.title).toBe('common.joinRevenueProgram{"name":"mock-rv-name"}');
    await waitFor(() => expect(document.title).toBe('common.joinRevenueProgram{"name":"mock-rv-name"}'));
  });

  it('should render LivePage404', async () => {
    useParamsMock.mockReturnValue({
      pageSlug: 'mock-page-slug'
    });
    useAnalyticsContextMock.mockReturnValue({
      setAnalyticsConfig: jest.fn()
    });
    useRequestMock.mockImplementation(
      () =>
        (_: any, { onFailure }: { onFailure: () => void }) =>
          onFailure()
    );
    tree();
    // Should render
    expect(screen.getByTestId('mock-live-page-404')).toBeVisible();
    // Shouldn't render
    expect(screen.queryByTestId('mock-donation-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-live-loading')).not.toBeInTheDocument();
  });

  it('should render DonationPage', async () => {
    useParamsMock.mockReturnValue({
      pageSlug: 'mock-page-slug'
    });
    useAnalyticsContextMock.mockReturnValue({
      setAnalyticsConfig: jest.fn()
    });
    useRequestMock.mockImplementation(
      () =>
        (_: any, { onSuccess }: { onSuccess: (any: any) => void }) =>
          onSuccess({ data: mockData })
    );
    tree();
    // Should render
    expect(within(screen.getByTestId('mock-donation-page')).getByText(/mock-rv-name/i)).toBeVisible();
    expect(within(screen.getByTestId('live-prop')).getByText('true')).toBeVisible();
    // Shouldn't render
    expect(screen.queryByTestId('mock-live-page-404')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-live-loading')).not.toBeInTheDocument();
  });

  it('should render LiveLoading', async () => {
    useParamsMock.mockReturnValue({
      pageSlug: 'mock-page-slug'
    });
    useAnalyticsContextMock.mockReturnValue({
      setAnalyticsConfig: jest.fn()
    });
    useRequestMock.mockImplementation(() => () => null);
    tree();
    // Should render
    expect(screen.getByTestId('mock-live-loading')).toBeInTheDocument();
    // Shouldn't render
    expect(screen.queryByTestId('mock-live-page-404')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-donation-page')).not.toBeInTheDocument();
  });
});
