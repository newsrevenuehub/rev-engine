import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { PortalContributionDetail } from 'hooks/usePortalContribution';
import MobileHeader, { MobileHeaderProps } from './MobileHeader';

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

function tree(props?: Partial<MobileHeaderProps>) {
  return render(<MobileHeader contribution={mockContribution} {...props} />);
}

describe('MobileHeader', () => {
  // Hidden used below because the component defaults to a display: none state,
  // and we can't simulate a mobile viewport.

  it('shows a link back to the contribution list', () => {
    tree();

    const back = screen.getByRole('link', { hidden: true, name: 'Back' });

    expect(back).toHaveAttribute('href', '/portal/my-contributions/');
  });

  it('shows a formatted date of the contribution', () => {
    const created = new Date('1/23/45').toISOString();

    tree({ contribution: { ...mockContribution, created } });
    expect(screen.getByTestId('created')).toHaveTextContent('January 23, 2045');
  });

  it('shows a formatted date of the next payment if set', () => {
    const next_payment_date = new Date('1/23/45').toISOString();

    tree({ contribution: { ...mockContribution, next_payment_date } });
    expect(screen.getByTestId('next_payment_date')).toHaveTextContent('January 23, 2045');
  });

  it('shows a message if the contribution has no next payment', () => {
    tree({ contribution: { ...mockContribution, next_payment_date: undefined } as any });
    expect(screen.getByTestId('next_payment_date')).toHaveTextContent('No future contribution');
  });

  it('shows the formatted amount of the contribution', () => {
    tree({ contribution: { ...mockContribution, amount: 12345 } as any });
    expect(screen.getByTestId('amount')).toHaveTextContent('$123.45');
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});