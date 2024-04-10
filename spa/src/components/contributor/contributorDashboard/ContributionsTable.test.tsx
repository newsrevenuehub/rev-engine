import { axe } from 'jest-axe';
import { useAlert } from 'react-alert';
import { render, screen, within } from 'test-utils';
import useContributorContributionList, { ContributorContribution } from 'hooks/useContributorContributionList';
import ContributionsTable, { ContributionsTableProps } from './ContributionsTable';
import userEvent from '@testing-library/user-event';

jest.mock('react-alert', () => ({
  ...jest.requireActual('react-alert'),
  useAlert: jest.fn()
}));
jest.mock('components/common/GlobalLoading/GlobalLoading');
jest.mock('hooks/useContributorContributionList');
jest.mock('./ContributionTableRow');

const mockContributions: ContributorContribution[] = [
  {
    id: 'mock-id-1',
    amount: 12345,
    card_brand: 'visa',
    created: new Date().toISOString(),
    interval: 'month',
    last4: 1234,
    revenue_program: 'mock-rp-1',
    status: 'paid',
    credit_card_expiration_date: 'mock-cc-expiration-1',
    is_cancelable: false,
    is_modifiable: false,
    last_payment_date: new Date().toISOString(),
    payment_type: 'mock-payment-type-1',
    provider_customer_id: 'mock-customer-id-1',
    stripe_account_id: 'mock-account-id-1'
  },
  {
    id: 'mock-id-2',
    amount: 12345,
    card_brand: 'visa',
    created: new Date().toISOString(),
    interval: 'month',
    last4: 1234,
    revenue_program: 'mock-rp-2',
    status: 'paid',
    credit_card_expiration_date: 'mock-cc-expiration-2',
    is_cancelable: false,
    is_modifiable: false,
    last_payment_date: new Date().toISOString(),
    payment_type: 'mock-payment-type-2',
    provider_customer_id: 'mock-customer-id-2',
    stripe_account_id: 'mock-account-id-2'
  }
];

function tree(props?: Partial<ContributionsTableProps>) {
  return render(<ContributionsTable rpSlug="mock-rp-slug" {...props} />);
}

describe('ContributionsTable', () => {
  const useAlertMock = useAlert as jest.Mock;
  const useContributorContributionsMock = useContributorContributionList as jest.Mock;

  beforeEach(() => {
    useAlertMock.mockReturnValue({ error: jest.fn() });
    useContributorContributionsMock.mockReturnValue({
      cancelRecurringContribution: jest.fn(),
      contributions: mockContributions,
      isError: false,
      isLoading: false,
      refetch: jest.fn(),
      total: mockContributions.length
    });
  });

  it('initally fetches the first page of contributions with the revenue program and page size provided', () => {
    tree({ rowsPerPage: 3, rpSlug: 'test-slug' });
    expect(useContributorContributionsMock.mock.calls).toEqual([
      [
        {
          page: 1,
          page_size: 3,
          rp: 'test-slug'
        }
      ]
    ]);
  });

  it('shows a loading status while contributions are loading', () => {
    useContributorContributionsMock.mockReturnValue({ isLoading: true });
    tree();
    expect(screen.getByTestId('mock-global-loading')).toBeInTheDocument();
  });

  it('shows an alert if contributions fail to load', () => {
    const error = jest.fn();

    useAlertMock.mockReturnValue({ error });
    useContributorContributionsMock.mockReturnValue({ contributions: [], isError: true });
    tree();
    expect(error.mock.calls).toEqual([['We encountered an issue and have been notified. Please try again.']]);
  });

  describe('After loading contributions', () => {
    it('shows table headers', () => {
      tree();

      for (const name of [
        'Date',
        'Amount',
        'Frequency',
        'Receipt date',
        'Payment method',
        'Payment status',
        'Cancel'
      ]) {
        expect(screen.getByRole('columnheader', { name })).toBeVisible();
      }
    });

    it('shows a table row for each contribution', () => {
      tree();

      const rows = screen.getAllByTestId('mock-contribution-table-row');

      expect(rows.length).toEqual(mockContributions.length);
      expect(rows[0]).toHaveAttribute('data-contribution-id', mockContributions[0].id);
      expect(rows[1]).toHaveAttribute('data-contribution-id', mockContributions[1].id);
    });

    it('shows a message if there are no contributions', () => {
      useContributorContributionsMock.mockReturnValue({ contributions: [] });
      tree();
      expect(screen.getByText('0 contributions to show.')).toBeVisible();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('shows buttons to paginate through results', () => {
      useContributorContributionsMock.mockReturnValue({ contributions: mockContributions, total: 20 });
      tree();

      const pagination = screen.getByLabelText('pagination navigation');

      expect(pagination).toBeVisible();

      // These have different labels because we're currently on page 1.

      expect(within(pagination).getByRole('button', { name: 'page 1' })).toBeVisible();
      expect(within(pagination).getByRole('button', { name: 'Go to page 2' })).toBeVisible();
    });

    it('fetches a new page when the user chooses a new page', () => {
      useContributorContributionsMock.mockReturnValue({ contributions: mockContributions, total: 20 });
      tree();
      useContributorContributionsMock.mockClear();
      userEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));
      expect(useContributorContributionsMock.mock.calls).toEqual([[{ page: 2, page_size: 10, rp: 'mock-rp-slug' }]]);
    });

    it('refetches contributions after a payment method is updated', () => {
      const refetch = jest.fn();

      useContributorContributionsMock.mockReturnValue({ refetch, contributions: mockContributions });
      tree();
      expect(refetch).not.toBeCalled();
      userEvent.click(screen.getAllByText('onUpdateRecurringComplete')[0]);
      expect(refetch).toBeCalledTimes(1);
    });

    it('cancels a recurring contribution when requested by a row', () => {
      const cancelRecurringContribution = jest.fn();

      useContributorContributionsMock.mockReturnValue({
        cancelRecurringContribution,
        contributions: mockContributions
      });
      tree();
      expect(cancelRecurringContribution).not.toBeCalled();
      userEvent.click(screen.getAllByText('onCancelRecurring')[1]);
      expect(cancelRecurringContribution.mock.calls).toEqual([[mockContributions[1]]]);
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
