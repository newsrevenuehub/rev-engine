import { axe } from 'jest-axe';
import { PortalContribution } from 'hooks/usePortalContributionList';
import { render, screen } from 'test-utils';
import ContributionItem, { ContributionItemProps, formattedStatuses } from './ContributionItem';
import { formattedCardBrands } from 'constants/creditCard';
import { LinkProps } from 'react-router-dom';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Link: ({ 'aria-selected': ariaSelected, children, replace, to }: LinkProps) => (
    // eslint-disable-next-line jsx-a11y/role-supports-aria-props
    <a aria-selected={ariaSelected} href={to} data-mock-replace={replace}>
      {children}
    </a>
  )
}));

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
  first_payment_date: new Date().toISOString(),
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
  describe('The link it displays', () => {
    it('goes to the contribution detail route if unselected', () => {
      tree();
      expect(screen.getByRole('link')).toHaveAttribute('href', `/portal/my-contributions/${mockContribution.id}/`);
    });

    it('goes to the contribution list route if selected', () => {
      tree({ selected: true });
      expect(screen.getByRole('link')).toHaveAttribute('href', '/portal/my-contributions/');
    });

    it("doesn't replace history by default", () => {
      tree();
      expect(screen.getByRole('link')).toHaveAttribute('data-mock-replace', 'false');
    });

    it('replaces history if the replaceHistory prop is true', () => {
      tree({ replaceHistory: true });
      expect(screen.getByRole('link')).toHaveAttribute('data-mock-replace', 'true');
    });

    it('is unselected by default', () => {
      tree();
      expect(screen.getByRole('link')).not.toHaveAttribute('aria-selected');
    });

    it('is selected if the selected prop is true', () => {
      tree({ selected: true });
      expect(screen.getByRole('link')).toHaveAttribute('aria-selected', 'true');
    });
  });

  it.each([
    ['one_time', 'One-time'],
    ['month', 'Monthly'],
    ['year', 'Yearly']
  ])('shows the right icon for %s contributions', (interval, label) => {
    tree({ contribution: { ...mockContribution, interval } as any });
    expect(screen.getByLabelText(label)).toBeInTheDocument();
  });

  it("doesn't throw if the contribution has a malformed interval", () =>
    expect(() => tree({ contribution: { ...mockContribution, interval: 'bad' } as any })).not.toThrow());

  it('shows the date the contribution was made', () => {
    const first_payment_date = new Date('1/23/45').toISOString();

    tree({ contribution: { ...mockContribution, first_payment_date } });
    expect(screen.getByTestId('first-payment-date')).toHaveTextContent('January 23, 2045');
  });

  it('shows an em dash if the date of the contribution is null', () => {
    tree({ contribution: { ...mockContribution, first_payment_date: null } });
    expect(screen.getByTestId('first-payment-date')).toHaveTextContent('—');
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
