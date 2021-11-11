import { render, waitFor } from 'test-utils';

// Test Subject
import Styles from './Styles';

jest.mock('components/MainLayout', () => ({
  __esModule: true,
  useGlobalContext: () => ({})
}));

const MOCK_STYLES = [{ id: 1 }, { id: 2 }, { id: 3 }];

it('should call provided fetchStyles function on mount', async () => {
  const mockFetchStyles = jest.fn(() => MOCK_STYLES);
  render(<Styles fetchStyles={mockFetchStyles} styles={[]} />);

  await waitFor(() => expect(mockFetchStyles).toBeCalledTimes(1), { interval: 100 });
});

const styleCardTestId = 'mock-style-card';
jest.mock('components/content/styles/StyleCard', () => () => <div data-testid={styleCardTestId} />);
it('should render a StyleCard per styles property', async () => {
  const mockFetchStyles = jest.fn();
  const { findAllByTestId } = render(<Styles fetchStyles={mockFetchStyles} styles={MOCK_STYLES} />);

  const pageCards = await findAllByTestId(styleCardTestId);
  expect(pageCards.length).toBe(MOCK_STYLES.length);
});

it('should open AddStylesModal when "add styles button" is clicked', () => {});
