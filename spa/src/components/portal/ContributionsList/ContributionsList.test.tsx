import { axe } from 'jest-axe';
import { useParams } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from 'test-utils';
import ContributionsList from './ContributionsList';
import { PortalAuthContext, PortalAuthContextResult } from 'hooks/usePortalAuth';
import { usePortalContributionList } from 'hooks/usePortalContributionList';
import userEvent from '@testing-library/user-event';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn()
}));
jest.mock('hooks/usePortalContributionList');
jest.mock('./ContributionDetail/ContributionDetail');
jest.mock('./ContributionItem/ContributionItem');
jest.mock('./ContributionFetchError');
jest.mock('../PortalPage');

function tree(context?: Partial<PortalAuthContextResult>) {
  return render(
    <PortalAuthContext.Provider value={{ contributor: { id: 1 } as any, ...context }}>
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
    expect(usePortalContributionsListMock).toBeCalledWith(1, expect.anything());
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
        contributions: [{ id: 1 }, { id: 2 }] as any,
        isError: false,
        isLoading: false,
        isFetching: false,
        refetch: jest.fn()
      });
      tree();
      expect(screen.getByTestId('mock-contribution-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('mock-contribution-item-2')).toBeInTheDocument();
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
        contributions: [{ id: 1 }, { id: 2 }] as any,
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
      useParamsMock.mockReturnValue({ contributionId: '1' });
      usePortalContributionsListMock.mockReturnValue({
        contributions: [{ id: 1 }, { id: 2 }] as any,
        isError: false,
        isLoading: false,
        isFetching: false,
        refetch: jest.fn()
      });
      tree();

      const detail = screen.getByTestId('mock-contribution-detail');

      expect(detail.dataset.contributorId).toBe('1');
      expect(detail.dataset.contributionId).toBe('1');
    });
  });

  describe('When contributions fail to load', () => {
    const refetch = jest.fn();

    beforeEach(() => {
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

  describe('Sorting contributions', () => {
    it('should sort contributions by date by default', () => {
      tree();
      expect(usePortalContributionsListMock).toBeCalledWith(expect.anything(), { ordering: '-created' });
    });

    it.each([
      ['status', 'Status'],
      ['amount', 'Amount (high to low)']
    ])('should sort contributions by %s when selected', async (ordering, option) => {
      tree();
      userEvent.click(screen.getByRole('button', { name: 'Date' }));

      await waitFor(() => {
        expect(screen.getByRole('option', { name: option })).toBeVisible();
      });

      userEvent.click(screen.getByRole('option', { name: option }));

      await waitFor(() => {
        expect(usePortalContributionsListMock).toBeCalledWith(expect.anything(), { ordering: `-${ordering}` });
      });
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
