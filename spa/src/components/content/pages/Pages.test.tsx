import { fireEvent, render, screen } from 'test-utils';
import { pagesbyRP, default as Pages } from './Pages';
import { axe } from 'jest-axe';
import useContributionPageList from 'hooks/useContributionPageList';
import { useHistory } from 'react-router-dom';

jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useHistory: jest.fn() }));
jest.mock('./AddPage');
jest.mock('./PageUsage');
jest.mock('hooks/useContributionPageList');

describe('pagesbyRP', () => {
  describe('Given pages list', () => {
    const inp = [
      {
        id: 1,
        name: 'mock-name-1',
        slug: 'mock-slug-1',
        revenue_program: { id: '1', name: 'rp1', slug: 'mock-slug-1' }
      },
      {
        id: 2,
        name: 'mock-name-2',
        slug: 'mock-slug-2',
        revenue_program: { id: '2', name: 'rp2', slug: 'mock-slug-2' }
      },
      {
        id: 3,
        name: 'mock-name-3',
        slug: 'mock-slug-3',
        revenue_program: { id: '2', name: 'rp2', slug: 'mock-slug-2' }
      }
    ];

    it('should group pages by RevenueProgram in pagesByRevProgram', () => {
      const result = pagesbyRP(inp as any);
      expect(result.length).toEqual(2);
    });

    it('should filter pages agnostic of capitalization, spacing and punctuation', () => {
      const filteredResult = pagesbyRP(inp as any, 'MOCK   _name -.()/1');
      expect(filteredResult).toEqual([
        {
          name: 'rp1',
          pages: [
            {
              id: 1,
              name: 'mock-name-1',
              slug: 'mock-slug-1',
              revenue_program: { id: '1', name: 'rp1', slug: 'mock-slug-1' }
            }
          ]
        }
      ]);
    });
  });

  describe('Given pages list having a page with a null rp', () => {
    let result;

    beforeEach(async () => {
      const inp = [
        { id: 1, revenue_program: { id: '1', name: 'rp1' } },
        { id: 2, revenue_program: { id: '2', name: 'rp2' } },
        { id: 3, revenue_program: null }
      ];
      result = pagesbyRP(inp as any);
    });

    it('should not throw an error and exclude the page with null rp from pagesByRevProgram', () => {
      expect(result.length).toEqual(2);
    });
  });
});

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
