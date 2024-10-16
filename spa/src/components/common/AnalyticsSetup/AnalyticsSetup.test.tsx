import { render, screen } from 'test-utils';
import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';
import AnalyticsSetup from './AnalyticsSetup';
import { HUB_GA_V3_ID } from 'appSettings';

jest.mock('components/analytics/AnalyticsContext', () => ({
  ...jest.requireActual('components/analytics/AnalyticsContext'),
  useAnalyticsContext: jest.fn()
}));

const tree = () => {
  return render(<AnalyticsSetup>Children</AnalyticsSetup>);
};

describe('AnalyticsSetup', () => {
  const useAnalyticsContextMock = jest.mocked(useAnalyticsContext);

  beforeEach(() => {
    useAnalyticsContextMock.mockReturnValue({
      setAnalyticsConfig: jest.fn(),
      analyticsInstance: null,
      trackConversion: jest.fn()
    });
  });

  it('renders', () => {
    tree();
    expect(screen.getByText('Children')).toBeInTheDocument();
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
          hubGaV3Id: HUB_GA_V3_ID
        }
      ]
    ]);
  });
});
