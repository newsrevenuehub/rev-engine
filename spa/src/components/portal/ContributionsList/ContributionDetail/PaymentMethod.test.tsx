import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import PaymentMethod, { PaymentMethodProps } from './PaymentMethod';
import { PortalContributionDetail } from 'hooks/usePortalContribution';
import { formattedCardBrands } from 'constants/creditCard';

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

function tree(props?: Partial<PaymentMethodProps>) {
  return render(<PaymentMethod contribution={mockContribution} editable={false} {...props} />);
}

describe('PaymentMethod', () => {
  it('shows a header', () => {
    tree();
    expect(screen.getByText('Payment Method')).toBeInTheDocument();
  });

  it('shows the credit card owner name', () => {
    tree();
    expect(screen.getByTestId('cc_owner_name')).toHaveTextContent(mockContribution.credit_card_owner_name);
  });

  it.each(Object.entries(formattedCardBrands))('shows a %s credit card as "%s"', (card_brand, formattedCardBrand) => {
    tree({ contribution: { ...mockContribution, card_brand } as any });
    expect(screen.getByTestId('card_brand')).toHaveTextContent(formattedCardBrand);
  });

  it('shows the last four digits of the credit card', () => {
    tree();
    expect(screen.getByTestId('last4')).toHaveTextContent(mockContribution.last4);
  });

  it('shows the card expiration date', () => {
    tree();
    expect(screen.getByTestId('expiration')).toHaveTextContent(mockContribution.credit_card_expiration_date);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
