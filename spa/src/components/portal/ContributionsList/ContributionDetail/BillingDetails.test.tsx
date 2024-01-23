import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { PortalContributionDetail } from 'hooks/usePortalContribution';
import BillingDetails, { BillingDetailsProps, INTERVAL_NAMES } from './BillingDetails';

const mockContribution: PortalContributionDetail = {
  amount: 12345,
  card_brand: 'amex',
  created: new Date().toISOString(),
  credit_card_expiration_date: new Date().toISOString(),
  credit_card_owner_name: 'mock-cc-owner-name',
  interval: 'month',
  is_cancelable: false,
  is_modifiable: false,
  last4: '7890',
  last_payment_date: new Date().toISOString(),
  next_payment_date: new Date().toISOString(),
  paid_fees: false,
  payments: [],
  payment_provider_id: 'mock-payment-provider-id',
  payment_type: 'card',
  provider_customer_id: 'mock-provider-customer-id',
  revenue_program: 1,
  status: 'paid'
};

function tree(props?: Partial<BillingDetailsProps>) {
  return render(<BillingDetails contribution={mockContribution} {...props} />);
}

describe('BillingDetails', () => {
  it('shows a header', () => {
    tree();
    expect(screen.getByText('Billing Details')).toBeInTheDocument();
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
    const created = new Date('1/23/45').toISOString();

    tree({ contribution: { ...mockContribution, created } });
    expect(screen.getByTestId('created')).toHaveTextContent('January 23, 2045');
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
