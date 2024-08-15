import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { PortalContributionDetail } from 'hooks/usePortalContribution';
import BillingDetails, { BillingDetailsProps, INTERVAL_NAMES } from './BillingDetails';

jest.mock('../DetailSection/DetailSection');

const mockContribution: PortalContributionDetail = {
  amount: 12345,
  card_brand: 'amex',
  card_expiration_date: new Date().toISOString(),
  card_last_4: '7890',
  card_owner_name: 'mock-cc-owner-name',
  created: new Date().toISOString(),
  interval: 'month',
  is_cancelable: false,
  is_modifiable: false,
  first_payment_date: new Date().toISOString(),
  last_payment_date: new Date().toISOString(),
  next_payment_date: new Date().toISOString(),
  paid_fees: false,
  payments: [],
  id: 1,
  payment_type: 'card',
  revenue_program: 1,
  status: 'paid',
  stripe_account_id: 'mock-stripe-account-id'
};

function tree(props?: Partial<BillingDetailsProps>) {
  return render(<BillingDetails contribution={mockContribution} {...props} />);
}

describe('BillingDetails', () => {
  it('shows a header', () => {
    tree();
    expect(screen.getByText('Billing Details')).toBeInTheDocument();
  });

  it("doesn't highlight its section", () => {
    tree();
    expect(screen.getByTestId('mock-detail-section').dataset.highlighted).toBeUndefined();
  });

  it('enables its section if not passed a disabled prop', () => {
    tree();
    expect(screen.getByTestId('mock-detail-section').dataset.disabled).toBeUndefined();
  });

  it('disables its section if passed a disabled prop', () => {
    tree({ disabled: true });
    expect(screen.getByTestId('mock-detail-section').dataset.disabled).toBe('true');
  });

  it('shows the formatted amount of the contribution', () => {
    tree();
    expect(screen.getByTestId('amount')).toHaveTextContent('$123.45');
  });

  it("shows a disabled, unchecked checkbox if the contribution didn't include fees", () => {
    tree({ contribution: { ...mockContribution, paid_fees: false } });

    const checkbox = screen.getByRole('checkbox', { name: 'Pay fees' });

    expect(checkbox).toBeDisabled();
    expect(checkbox).not.toBeChecked();
  });

  it('shows a disabled, checked checkbox if the contribution did include fees', () => {
    tree({ contribution: { ...mockContribution, paid_fees: true } });

    const checkbox = screen.getByRole('checkbox', { name: 'Pay fees' });

    expect(checkbox).toBeDisabled();
    expect(checkbox).toBeChecked();
  });

  it('shows the formatted date of the contribution', () => {
    const first_payment_date = new Date('1/23/45').toISOString();

    tree({ contribution: { ...mockContribution, first_payment_date } });
    expect(screen.getByTestId('first-billing-date')).toHaveTextContent('January 23, 2045');
  });

  it.each(Object.entries(INTERVAL_NAMES))('shows a %s interval as "%s" frequency', (interval, intervalLabel) => {
    tree({ contribution: { ...mockContribution, interval } as any });
    expect(screen.getByTestId('frequency')).toHaveTextContent(intervalLabel);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
