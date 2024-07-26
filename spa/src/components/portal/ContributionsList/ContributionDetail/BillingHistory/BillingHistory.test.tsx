import { axe } from 'jest-axe';
import { render, screen, within } from 'test-utils';
import BillingHistory, { BillingHistoryProps } from './BillingHistory';
import { PortalContributionPayment } from 'hooks/usePortalContribution';
import usePortal from 'hooks/usePortal';

jest.mock('../DetailSection/DetailSection');
jest.mock('hooks/usePortal');

const sendEmailReceipt = jest.fn();
const mockPayments: PortalContributionPayment[] = [
  {
    amount_refunded: 0,
    created: new Date('1/1/2001').toISOString(),
    gross_amount_paid: 12345,
    net_amount_paid: 12345,
    status: 'paid',
    transaction_time: new Date('1/1/3001').toISOString()
  },
  {
    amount_refunded: 678,
    created: new Date('1/2/2001').toISOString(),
    gross_amount_paid: 678,
    net_amount_paid: 678,
    status: 'refunded'
    // transaction_time omitted intentionally to test fallback.
  }
];

function tree(props?: Partial<BillingHistoryProps>) {
  return render(<BillingHistory onSendEmailReceipt={sendEmailReceipt} payments={mockPayments} {...props} />);
}

describe('BillingHistory', () => {
  const usePortalMock = jest.mocked(usePortal);

  beforeEach(() => {
    usePortalMock.mockReturnValue({
      page: { revenue_program: { organization: { send_receipt_email_via_nre: true } } }
    } as any);
  });

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

  it('shows formatted transaction dates in the first column, falling back to creation time if not present', () => {
    tree();

    const rows = screen.getAllByRole('row');

    // Our second mock payment has no transaction_time.

    expect(within(rows[1]).getAllByRole('cell')[0]).toHaveTextContent('1/1/3001');
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

  it('shows a resend receipt button if org\'s "send_receipt_email_via_nre" flag is "true"', () => {
    tree();

    expect(screen.getByRole('button', { name: 'Resend receipt' })).toBeVisible();
  });

  it('does not show a resend receipt button if org\'s "send_receipt_email_via_nre" flag is "false"', () => {
    usePortalMock.mockReturnValue({
      page: { revenue_program: { organization: { send_receipt_email_via_nre: false } } }
    } as any);
    tree();

    expect(screen.queryByRole('button', { name: 'Resend receipt' })).not.toBeInTheDocument();
  });

  it('calls sendEmailReceipt when the resend receipt button is clicked', () => {
    tree();
    expect(sendEmailReceipt).not.toHaveBeenCalled();

    screen.getByRole('button', { name: 'Resend receipt' }).click();

    expect(sendEmailReceipt).toBeCalledTimes(1);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
