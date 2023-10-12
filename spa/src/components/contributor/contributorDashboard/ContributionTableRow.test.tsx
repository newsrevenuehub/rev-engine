import userEvent from '@testing-library/user-event';
import { ContributionInterval } from 'constants/contributionIntervals';
import { NO_VALUE } from 'constants/textConstants';
import { ContributorContribution } from 'hooks/useContributorContributionList';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import ContributionTableRow, { ContributionTableRowProps } from './ContributionTableRow';

jest.mock('./CancelRecurringButton');
jest.mock('./ContributionPaymentMethod');

const mockContribution: ContributorContribution = {
  id: 'mock-id',
  amount: 12345,
  card_brand: 'visa',
  created: new Date().toISOString(),
  interval: 'month',
  last4: 1234,
  revenue_program: 'mock-rp',
  status: 'paid',
  credit_card_expiration_date: 'mock-cc-expiration',
  is_cancelable: false,
  is_modifiable: false,
  last_payment_date: new Date().toISOString(),
  payment_type: 'mock-payment-type',
  provider_customer_id: 'mock-customer-id',
  stripe_account_id: 'mock-account-id'
};

function tree(props?: Partial<ContributionTableRowProps>) {
  return render(
    <table>
      <tbody>
        <ContributionTableRow
          contribution={mockContribution}
          onCancelRecurring={jest.fn()}
          onUpdateRecurringComplete={jest.fn()}
          {...props}
        />
      </tbody>
    </table>
  );
}

describe('ContributionTableRow', () => {
  it('renders a table row', () => {
    tree();
    expect(screen.getByRole('row')).toBeVisible();
  });

  it('displays a cell showing when the contribution was created', () => {
    tree({ contribution: { ...mockContribution, created: new Date('1/2/34 5:23 PM').toISOString() } });
    expect(screen.getByTestId('created-cell')).toHaveTextContent('01/2/2034 05:23 PM');
  });

  it('displays a cell showing a placeholder if the contribution has no creation date', () => {
    tree({ contribution: { ...mockContribution, created: undefined } as any });
    expect(screen.getByTestId('created-cell')).toHaveTextContent(NO_VALUE);
  });

  it('displays a cell showing the contribution amount', () => {
    tree({ contribution: { ...mockContribution, amount: 123456 } });
    expect(screen.getByTestId('amount-cell')).toHaveTextContent('$1,234.56');
  });

  it('displays a cell showing a placeholder if the contribution has no amount', () => {
    tree({ contribution: { ...mockContribution, amount: undefined } as any });
    expect(screen.getByTestId('amount-cell')).toHaveTextContent(NO_VALUE);
  });

  it.each([
    ['one_time', 'common.frequency.adjectives.oneTime'],
    ['month', 'common.frequency.adjectives.monthly'],
    ['year', 'common.frequency.adjectives.yearly']
  ])('displays a cell showing the contribution interval for %s', (interval, displayValue) => {
    tree({ contribution: { ...mockContribution, interval: interval as ContributionInterval } });
    expect(screen.getByTestId('interval-cell')).toHaveTextContent(displayValue);
  });

  it('displays a cell showing a placeholder if the contribution has no interval', () => {
    tree({ contribution: { ...mockContribution, interval: undefined } as any });
    expect(screen.getByTestId('interval-cell')).toHaveTextContent(NO_VALUE);
  });

  it('displays a cell showing the last payment date for the contribution', () => {
    tree({ contribution: { ...mockContribution, last_payment_date: new Date('1/2/34 5:23 PM').toISOString() } });
    expect(screen.getByTestId('last-payment-cell')).toHaveTextContent('01/2/2034 05:23 PM');
  });

  it('displays a cell showing a placeholder if the contribution has no last payment date', () => {
    tree({ contribution: { ...mockContribution, last_payment_date: undefined } as any });
    expect(screen.getByTestId('last-payment-cell')).toHaveTextContent(NO_VALUE);
  });

  it('displays the payment method', () => {
    tree({ contribution: { ...mockContribution, id: 'payment-method-test' } });
    expect(screen.getByTestId('mock-contribution-payment-method')).toHaveAttribute(
      'data-contribution-id',
      'payment-method-test'
    );
  });

  it('calls the onUpdateRecurringComplete prop with the contribution when the payment method is edited', () => {
    const onUpdateRecurringComplete = jest.fn();

    tree({ onUpdateRecurringComplete });
    expect(onUpdateRecurringComplete).not.toBeCalled();
    userEvent.click(screen.getByText('onUpdateComplete'));
    expect(onUpdateRecurringComplete.mock.calls).toEqual([[mockContribution]]);
  });

  it('displays a cell showing the status of the contribution', () => {
    tree({ contribution: { ...mockContribution, status: 'failed' } });
    expect(screen.getByTestId('status-cell')).toHaveTextContent('Failed');
  });

  it('displays an empty cell if the contribution has no status', () => {
    tree({ contribution: { ...mockContribution, status: undefined } });
    expect(screen.getByTestId('status-cell')).toHaveTextContent('');
  });

  it('displays a button to cancel the contribution', () => {
    tree({ contribution: { ...mockContribution, id: 'cancel-test' } });
    expect(screen.getByTestId('mock-cancel-recurring-button')).toHaveAttribute('data-contribution-id', 'cancel-test');
  });

  it('calls the onCancelRecurring prop with the contribution when the payment method is edited', () => {
    const onCancelRecurring = jest.fn();

    tree({ onCancelRecurring });
    expect(onCancelRecurring).not.toBeCalled();
    userEvent.click(screen.getByText('onCancelRecurring'));
    expect(onCancelRecurring.mock.calls).toEqual([[mockContribution]]);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
