import { PaymentStatus as PaymentStatusType } from 'constants/paymentStatus';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import PaymentStatus, { PaymentStatusProps } from './PaymentStatus';

function tree(props?: Partial<PaymentStatusProps>) {
  return render(<PaymentStatus status="paid" {...props} />);
}

describe('PaymentStatus', () => {
  it.each([
    ['canceled', 'Canceled'],
    ['failed', 'Failed'],
    ['flagged', 'Flagged'],
    ['paid', 'Paid'],
    ['processing', 'Processing'],
    ['rejected', 'Rejected']
  ])('displays a %s status as %p', (status, displayValue) => {
    tree({ status: status as PaymentStatusType });
    expect(screen.getByText(displayValue)).toBeVisible();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
