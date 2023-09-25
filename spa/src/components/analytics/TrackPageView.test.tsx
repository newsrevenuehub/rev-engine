import TrackPageView from './TrackPageView';
import { render, screen } from 'test-utils';
import { useAnalyticsContext } from './AnalyticsContext';

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useLocation: () => ({
    pathname: '/mock-path'
  })
}));
jest.mock('components/analytics/AnalyticsContext', () => ({
  ...jest.requireActual('components/analytics/AnalyticsContext'),
  useAnalyticsContext: jest.fn()
}));

const page = jest.fn();

describe('TrackPageView', () => {
  const useAnalyticsContextMock = jest.mocked(useAnalyticsContext);

  beforeEach(() => {
    useAnalyticsContextMock.mockReturnValue({ analyticsInstance: { page } } as any);
  });

  it('should render children', () => {
    render(
      <TrackPageView>
        <div data-testid="child" />
      </TrackPageView>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should render children with props', () => {
    render(
      <TrackPageView custom="mock-props">
        <div data-testid="child" />
      </TrackPageView>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toHaveAttribute('custom', 'mock-props');
  });

  it('should call analyticsInstance.page on mount', () => {
    render(
      <TrackPageView>
        <div />
      </TrackPageView>
    );

    expect(page).toBeCalledTimes(1);
  });
});
