import { axe } from 'jest-axe';
import { PortalContribution } from 'hooks/usePortalContributionList';
import { render, screen } from 'test-utils';
import ContributionItem, { ContributionItemProps, formattedCardBrands, formattedStatuses } from './ContributionItem';

const mockContribution: PortalContribution = {
  amount: 12345,
  card_brand: 'amex',
  created: new Date().toISOString(),
  card_expiration_date: new Date().toISOString(),
  id: 1,
  interval: 'month',
  is_cancelable: false,
  is_modifiable: false,
  card_last_4: '7890',
  last_payment_date: new Date().toISOString(),
  next_payment_date: new Date().toISOString(),
  payment_type: 'card',
  revenue_program: 1,
  status: 'paid'
};

function tree(props?: Partial<ContributionItemProps>) {
  return render(<ContributionItem contribution={mockContribution} {...props} />);
}

describe('ContributionItem', () => {
  it.each([
    ['one_time', 'One time'],
    ['month', 'Monthly'],
    ['year', 'Yearly']
  ])('shows the right icon for %s contributions', (interval, label) => {
    tree({ contribution: { ...mockContribution, interval } as any });
    expect(screen.getByLabelText(label)).toBeInTheDocument();
  });

  it("doesn't throw if the contribution has a malformed interval", () =>
    expect(() => tree({ contribution: { ...mockContribution, interval: 'bad' } as any })).not.toThrow());

  it('shows the date the contribution was made', () => {
    const created = new Date('1/23/45').toISOString();

    tree({ contribution: { ...mockContribution, created } });
    expect(screen.getByTestId('created')).toHaveTextContent('January 23, 2045');
  });

  it("shows the date of the next contribution's payment if set", () => {
    const next_payment_date = new Date('1/23/45').toISOString();

    tree({ contribution: { ...mockContribution, next_payment_date } });
    expect(screen.getByTestId('next-payment-date')).toHaveTextContent('Next contribution January 23, 2045');
  });

  it("shows a message if there isn't a next payment date", () => {
    tree({ contribution: { ...mockContribution, next_payment_date: '' } });
    expect(screen.getByTestId('next-payment-date')).toHaveTextContent('No future contribution');
  });

  it.each(Object.entries(formattedCardBrands))('shows a %s card as %s', (card_brand, label) => {
    tree({ contribution: { ...mockContribution, card_brand } as any });
    expect(screen.getByTestId('card-brand')).toHaveTextContent(label);
  });

  it('shows the last four digits of the card', () => {
    tree({ contribution: { ...mockContribution, card_last_4: '4567' } });
    expect(screen.getByTestId('card-last4')).toHaveTextContent('4567');
  });

  it.each(Object.entries(formattedStatuses))('shows a %s status as %s', (status, label) => {
    tree({ contribution: { ...mockContribution, status } as any });
    expect(screen.getByTestId('status')).toHaveTextContent(label);
  });

  it.each([
    [1234, '$12.34'],
    [12300, '$123']
  ])('displays a %i amount as %s', (amount, formattedAmount) => {
    tree({ contribution: { ...mockContribution, amount } });
    expect(screen.getByTestId('amount')).toHaveTextContent(formattedAmount);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
