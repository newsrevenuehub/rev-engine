import { fireEvent, render, screen } from 'test-utils';
import { axe } from 'jest-axe';
import { useHistory } from 'react-router-dom';
import useContributionPageList from 'hooks/useContributionPageList';
import Pages from './Pages';

jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useHistory: jest.fn() }));
jest.mock('./AddPage');
jest.mock('./PageUsage');
jest.mock('components/common/Button/ContributionPageButton/ContributionPageButton');
jest.mock('hooks/useContributionPageList');

function tree() {
  return render(<Pages />);
}

describe('Pages', () => {
  const useContributionPageListMock = useContributionPageList as jest.Mock;
  const useHistoryMock = useHistory as jest.Mock;

  beforeEach(() => {
    useContributionPageListMock.mockReturnValue({
      pages: [
        { name: 'Mock Page 1', id: 1, revenue_program: { id: 'mock-rp-id', name: 'Mock RP' } },
        { name: 'Mock Page 2', id: 2, revenue_program: { id: 'mock-rp-id', name: 'Mock RP' } }
      ]
    });
  });

  it('shows a loading spinner while pages are loading', () => {
    useContributionPageListMock.mockReturnValue({ isLoading: true, pages: [] });
    tree();
    expect(screen.getByTestId('pages-loading')).toBeInTheDocument();
  });

  it('shows an edit button for every page', () => {
    tree();
    expect(screen.getByRole('button', { name: 'Mock Page 1' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Mock Page 2' })).toBeVisible();
  });

  it('sorts edit buttons by revenue program name, then page name', () => {
    useContributionPageListMock.mockReturnValue({
      pages: [
        { name: 'Mock Page 2', id: 200, revenue_program: { id: 'mock-rp-id-2', name: 'Mock RP 2' } },
        { name: 'Mock Page 1', id: 201, revenue_program: { id: 'mock-rp-id-2', name: 'Mock RP 2' } },
        { name: 'Mock Page 2', id: 101, revenue_program: { id: 'mock-rp-id-1', name: 'Mock RP 1' } },
        { name: 'Mock Page 1', id: 100, revenue_program: { id: 'mock-rp-id-1', name: 'Mock RP 1' } }
      ]
    });
    tree();

    // See https://stackoverflow.com/a/74260431

    const buttons = screen.getAllByRole('button');

    expect(buttons.length).toBe(4);
    expect(
      screen
        .getByTestId('mock-contribution-page-button-100')
        .compareDocumentPosition(screen.getByTestId('mock-contribution-page-button-101'))
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(
      screen
        .getByTestId('mock-contribution-page-button-101')
        .compareDocumentPosition(screen.getByTestId('mock-contribution-page-button-201'))
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(
      screen
        .getByTestId('mock-contribution-page-button-201')
        .compareDocumentPosition(screen.getByTestId('mock-contribution-page-button-200'))
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('filters pages by page name while maintaining sort', () => {
    useContributionPageListMock.mockReturnValue({
      pages: [
        {
          name: 'Mock Page search 2',
          id: 200,
          revenue_program: { id: 'mock-rp-id-2', name: 'Mock RP 2', slug: 'mock-rp-2' },
          slug: 'mock-page-2'
        },
        {
          name: 'Mock Page search 1',
          id: 201,
          revenue_program: { id: 'mock-rp-id-2', name: 'Mock RP 2', slug: 'mock-rp-2' },
          slug: 'mock-page-1'
        },
        {
          name: 'Mock Page 1',
          id: 202,
          revenue_program: { id: 'mock-rp-id-2', name: 'Mock RP 2', slug: 'mock-rp-2' },
          slug: 'mock-page-unrelated'
        }
      ]
    });
    tree();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search for Pages' }), { target: { value: 'SEARCH' } });

    const buttons = screen.getAllByRole('button');

    expect(buttons.length).toBe(2);
    expect(
      screen
        .getByTestId('mock-contribution-page-button-201')
        .compareDocumentPosition(screen.getByTestId('mock-contribution-page-button-200'))
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('filters pages by page slug while maintaining sort', () => {
    useContributionPageListMock.mockReturnValue({
      pages: [
        {
          name: 'Mock Page 1',
          id: 200,
          revenue_program: { id: 'mock-rp-id-2', name: 'Mock RP 2', slug: 'mock-rp-2' },
          slug: 'search'
        },
        {
          name: 'Mock Page 2',
          id: 201,
          revenue_program: { id: 'mock-rp-id-2', name: 'Mock RP 2', slug: 'mock-rp-2' },
          slug: 'search'
        },
        {
          name: 'Mock Page 3',
          id: 202,
          revenue_program: { id: 'mock-rp-id-2', name: 'Mock RP 2', slug: 'mock-rp-2' },
          slug: 'ignore'
        }
      ]
    });
    tree();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search for Pages' }), { target: { value: 'SEARCH' } });

    const buttons = screen.getAllByRole('button');

    expect(buttons.length).toBe(2);
    expect(
      screen
        .getByTestId('mock-contribution-page-button-200')
        .compareDocumentPosition(screen.getByTestId('mock-contribution-page-button-201'))
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('gracefully handles pages with null slugs', () => {
    useContributionPageListMock.mockReturnValue({
      pages: [
        {
          name: 'Mock Page search 2',
          id: 200,
          revenue_program: { id: 'mock-rp-id-2', name: 'Mock RP 2', slug: 'mock-rp-2' },
          slug: null
        },
        {
          name: 'Mock Page search 1',
          id: 201,
          revenue_program: { id: 'mock-rp-id-2', name: 'Mock RP 2', slug: 'mock-rp-2' },
          slug: null
        },
        {
          name: 'Mock Page 1',
          id: 202,
          revenue_program: { id: 'mock-rp-id-2', name: 'Mock RP 2', slug: 'mock-rp-2' },
          slug: null
        }
      ]
    });
    tree();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search for Pages' }), { target: { value: 'SEARCH' } });

    const buttons = screen.getAllByRole('button');

    expect(buttons.length).toBe(2);
    expect(
      screen
        .getByTestId('mock-contribution-page-button-201')
        .compareDocumentPosition(screen.getByTestId('mock-contribution-page-button-200'))
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('filters pages by revenue program name while maintaining sort', () => {
    useContributionPageListMock.mockReturnValue({
      pages: [
        {
          name: 'Mock Page 1',
          id: 200,
          revenue_program: { id: 'mock-rp-id-2', name: 'Mock RP 2 search', slug: 'mock-rp-2' },
          slug: ''
        },
        {
          name: 'Mock Page 2',
          id: 201,
          revenue_program: { id: 'mock-rp-id-2', name: 'Mock RP 2 search', slug: 'mock-rp-2' },
          slug: ''
        },
        {
          name: 'Mock Page 3',
          id: 202,
          revenue_program: { id: 'mock-rp-id-2', name: 'Mock RP 2', slug: 'mock-rp-2' },
          slug: ''
        }
      ]
    });
    tree();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search for Pages' }), { target: { value: 'SEARCH' } });

    const buttons = screen.getAllByRole('button');

    expect(buttons.length).toBe(2);
    expect(
      screen
        .getByTestId('mock-contribution-page-button-200')
        .compareDocumentPosition(screen.getByTestId('mock-contribution-page-button-201'))
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('filters pages by revenue program slug while maintaining sort', () => {
    useContributionPageListMock.mockReturnValue({
      pages: [
        {
          name: 'Mock Page 1',
          id: 200,
          revenue_program: { id: 'mock-rp-id-2', name: 'Mock RP 2', slug: 'mock-rp-2-search' },
          slug: ''
        },
        {
          name: 'Mock Page 2',
          id: 201,
          revenue_program: { id: 'mock-rp-id-2', name: 'Mock RP 2', slug: 'mock-rp-2-search' },
          slug: ''
        },
        {
          name: 'Mock Page 3',
          id: 202,
          revenue_program: { id: 'mock-rp-id-2', name: 'Mock RP 2', slug: 'mock-rp-2' },
          slug: ''
        }
      ]
    });
    tree();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search for Pages' }), { target: { value: 'SEARCH' } });

    const buttons = screen.getAllByRole('button');

    expect(buttons.length).toBe(2);
    expect(
      screen
        .getByTestId('mock-contribution-page-button-200')
        .compareDocumentPosition(screen.getByTestId('mock-contribution-page-button-201'))
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('goes to the page editor route when an edit page is clicked', () => {
    const push = jest.fn();

    useHistoryMock.mockReturnValue({ push });
    tree();
    fireEvent.click(screen.getByRole('button', { name: 'Mock Page 1' }));
    expect(push.mock.calls).toEqual([['/edit/pages/1/']]);
  });

  it('shows a button to add a new page', () => {
    tree();
    expect(screen.getByTestId('mock-add-page')).toBeVisible();
  });

  it('shows the page limit', () => {
    tree();
    expect(screen.getByTestId('mock-page-usage')).toBeVisible();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
