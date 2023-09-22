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

  it('should render component', () => {
    const Component = (props: any) => <div {...props} data-testid="component" />;

    render(<TrackPageView aria-label="mock-props" component={Component} />);

    expect(screen.getByTestId('component')).toBeInTheDocument();
    expect(screen.getByTestId('component')).toHaveAttribute('aria-label', 'mock-props');
  });

  it('should throw error if no children or component', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TrackPageView />)).toThrowError();
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
