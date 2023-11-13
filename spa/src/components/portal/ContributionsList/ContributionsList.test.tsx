import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import ContributionsList from './ContributionsList';
import { PortalAuthContext, PortalAuthContextResult } from 'hooks/usePortalAuth';
import { usePortalContributionList } from 'hooks/usePortalContributionList';

jest.mock('hooks/usePortalContributionList');
jest.mock('./ContributionItem');

function tree(context?: Partial<PortalAuthContextResult>) {
  return render(
    <PortalAuthContext.Provider value={{ contributor: { id: 'mock-contributor-id' } as any, ...context }}>
      <ContributionsList />
    </PortalAuthContext.Provider>
  );
}

describe('ContributionsList', () => {
  const usePortalContributionsListMock = jest.mocked(usePortalContributionList);

  beforeEach(() => {
    usePortalContributionsListMock.mockReturnValue({
      contributions: [],
      isError: false,
      isFetching: false,
      isLoading: false
    });
  });

  it('shows a Transactions heading', () => {
    tree();
    expect(screen.getByRole('heading', { name: 'Transactions' })).toBeInTheDocument();
  });

  it('fetches contributions for the current user', () => {
    tree();
    expect(usePortalContributionsListMock).toBeCalledWith('mock-contributor-id');
  });

  it('shows a spinner', () => {
    usePortalContributionsListMock.mockReturnValue({
      contributions: [],
      isError: false,
      isFetching: true,
      isLoading: true
    });
    tree();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  describe('After contributions are fetched', () => {
    it('shows a contribution item for each contribution', () => {
      usePortalContributionsListMock.mockReturnValue({
        contributions: [{ payment_provider_id: 'mock-id-1 ' }, { payment_provider_id: 'mock-id-2' }] as any,
        isError: false,
        isLoading: false,
        isFetching: false
      });
      tree();
      expect(screen.getByTestId('mock-contribution-item-mock-id-1')).toBeInTheDocument();
      expect(screen.getByTestId('mock-contribution-item-mock-id-2')).toBeInTheDocument();
    });

    it('shows a message if the user has no contributions', () => {
      usePortalContributionsListMock.mockReturnValue({
        contributions: [],
        isError: false,
        isLoading: false,
        isFetching: false
      });
      tree();
      expect(screen.getByText('0 contributions to show')).toBeInTheDocument();
    });

    it("doesn't show a spinner", () => {
      tree();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
