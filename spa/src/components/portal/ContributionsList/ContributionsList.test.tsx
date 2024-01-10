import { axe } from 'jest-axe';
import { useParams } from 'react-router-dom';
import { fireEvent, render, screen } from 'test-utils';
import ContributionsList from './ContributionsList';
import { PortalAuthContext, PortalAuthContextResult } from 'hooks/usePortalAuth';
import { usePortalContributionList } from 'hooks/usePortalContributionList';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn()
}));
jest.mock('hooks/usePortalContributionList');
jest.mock('./ContributionDetail/ContributionDetail');
jest.mock('./ContributionItem/ContributionItem');
jest.mock('./ContributionFetchError');

function tree(context?: Partial<PortalAuthContextResult>) {
  return render(
    <PortalAuthContext.Provider value={{ contributor: { id: 'mock-contributor-id' } as any, ...context }}>
      <ContributionsList />
    </PortalAuthContext.Provider>
  );
}

describe('ContributionsList', () => {
  const useParamsMock = jest.mocked(useParams);
  const usePortalContributionsListMock = jest.mocked(usePortalContributionList);

  beforeEach(() => {
    useParamsMock.mockReturnValue({});
    usePortalContributionsListMock.mockReturnValue({
      contributions: [],
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: jest.fn()
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
      isLoading: true,
      refetch: jest.fn()
    });
    tree();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  describe('After contributions are fetched', () => {
    it('shows a contribution item for each contribution', () => {
      usePortalContributionsListMock.mockReturnValue({
        contributions: [{ payment_provider_id: 'mock-id-1' }, { payment_provider_id: 'mock-id-2' }] as any,
        isError: false,
        isLoading: false,
        isFetching: false,
        refetch: jest.fn()
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
        isFetching: false,
        refetch: jest.fn()
      });
      tree();
      expect(screen.getByText('0 contributions to show')).toBeInTheDocument();
    });

    it("doesn't show a spinner", () => {
      tree();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it("doesn't show contribution detail if not present in the route", () => {
      usePortalContributionsListMock.mockReturnValue({
        contributions: [{ payment_provider_id: 'mock-id-1' }, { payment_provider_id: 'mock-id-2' }] as any,
        isError: false,
        isLoading: false,
        isFetching: false,
        refetch: jest.fn()
      });
      useParamsMock.mockReturnValue({});
      tree();
      expect(screen.queryByTestId('mock-contribution-detail')).not.toBeInTheDocument();
    });

    it('shows contribution detail if present in the route', () => {
      useParamsMock.mockReturnValue({ contributionId: 'mock-id-1' });
      usePortalContributionsListMock.mockReturnValue({
        contributions: [{ payment_provider_id: 'mock-id-1' }, { payment_provider_id: 'mock-id-2' }] as any,
        isError: false,
        isLoading: false,
        isFetching: false,
        refetch: jest.fn()
      });
      tree();

      const detail = screen.getByTestId('mock-contribution-detail');

      expect(detail.dataset.contributorId).toBe('mock-contributor-id');
      expect(detail.dataset.contributionId).toBe('mock-id-1');
    });
  });

  describe('When contributions fail to load', () => {
    let refetch: jest.Mock;

    beforeEach(() => {
      refetch = jest.fn();
      usePortalContributionsListMock.mockReturnValue({
        refetch,
        contributions: [],
        isError: true,
        isLoading: false,
        isFetching: false
      });
    });

    it('shows an error message', () => {
      tree();
      expect(screen.getByTestId('mock-contribution-fetch-error')).toBeInTheDocument();
    });

    it('refetches contributions when the retry button is clicked', () => {
      tree();
      expect(refetch).not.toBeCalled();
      fireEvent.click(screen.getByTestId('mock-contribution-fetch-error'));
      expect(refetch).toBeCalledTimes(1);
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
