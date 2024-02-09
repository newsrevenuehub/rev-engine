import { axe } from 'jest-axe';
import { render, screen, within } from 'test-utils';
import BillingHistory, { BillingHistoryProps } from './BillingHistory';
import { PortalContributionPayment } from 'hooks/usePortalContribution';

jest.mock('../DetailSection/DetailSection');

const mockPayments: PortalContributionPayment[] = [
  {
    amount_refunded: 0,
    created: new Date('1/1/2001').toISOString(),
    gross_amount_paid: 12345,
    net_amount_paid: 12345,
    status: 'paid'
  },
  {
    amount_refunded: 678,
    created: new Date('1/2/2001').toISOString(),
    gross_amount_paid: 678,
    net_amount_paid: 678,
    status: 'refunded'
  }
];

function tree(props?: Partial<BillingHistoryProps>) {
  return render(<BillingHistory payments={mockPayments} {...props} />);
}

describe('BillingHistory', () => {
  it('shows a header', () => {
    tree();
    expect(screen.getByText('Billing History')).toBeInTheDocument();
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

  it('shows a row for each payment', () => {
    tree();

    // One extra row for the (visible only to AX tech) header.

    expect(screen.getAllByRole('row').length).toBe(mockPayments.length + 1);
  });

  it('shows formatted dates in the first column', () => {
    tree();

    const rows = screen.getAllByRole('row');

    expect(within(rows[1]).getAllByRole('cell')[0]).toHaveTextContent('1/1/2001');
    expect(within(rows[2]).getAllByRole('cell')[0]).toHaveTextContent('1/2/2001');
  });

  it('shows formatted amounts in the second column', () => {
    tree();

    const rows = screen.getAllByRole('row');

    expect(within(rows[1]).getAllByRole('cell')[1]).toHaveTextContent('$123.45');
    expect(within(rows[2]).getAllByRole('cell')[1]).toHaveTextContent('$6.78');
  });

  it('shows formatted statuses in the third column', () => {
    tree();

    const rows = screen.getAllByRole('row');

    expect(within(rows[1]).getAllByRole('cell')[2]).toHaveTextContent('Paid');
    expect(within(rows[2]).getAllByRole('cell')[2]).toHaveTextContent('Refunded');
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
