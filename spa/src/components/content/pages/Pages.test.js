import { render } from 'test-utils';
import { server, rest, revengineApi } from 'test-server';

// Constants
import { LIST_PAGES } from 'ajax/endpoints';

// Test Subject
import Pages from './Pages';

jest.mock('components/MainLayout', () => ({
  __esModule: true,
  useGlobalContext: () => ({})
}));

const MOCK_RPS = [
  { id: 1, name: 'TestRP1' },
  { id: 2, name: 'TestRP2' }
];

const MOCK_PAGES = [
  { id: 1, revenue_program: MOCK_RPS[0] },
  { id: 2, revenue_program: MOCK_RPS[0] },
  { id: 3, revenue_program: MOCK_RPS[1] }
];

const pageCardTestId = 'mock-page-card';
jest.mock('components/content/pages/PageCard', () => () => <div data-testid={pageCardTestId} />);
it('should render a PageCard per page returned from request', async () => {
  const { findAllByTestId } = render(<Pages />);
  server.use(rest.get(revengineApi(LIST_PAGES), (req, res, ctx) => res(ctx.json(MOCK_PAGES))));

  const pageCards = await findAllByTestId(pageCardTestId);
  expect(pageCards.length).toBe(MOCK_PAGES.length);
});

it('should render a RevenueProgram accordion per distinct RevenueProgram', async () => {
  const { findAllByRole, getByText } = render(<Pages />);
  server.use(rest.get(revengineApi(LIST_PAGES), (req, res, ctx) => res(ctx.json(MOCK_PAGES))));

  const rpHeadings = await findAllByRole('heading', { level: 3 });
  expect(rpHeadings.length).toBe(MOCK_RPS.length);
  MOCK_RPS.forEach((rp) => expect(getByText(rp.name)).toBeInTheDocument());
});

it('should open AddPageModal when "add page button" is clicked', () => {});
