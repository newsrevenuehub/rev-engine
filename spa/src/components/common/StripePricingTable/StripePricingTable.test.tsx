import { axe } from 'jest-axe';
import { render } from 'test-utils';
import StripePricingTable, { StripePricingTableProps } from './StripePricingTable';

function tree(props?: Partial<StripePricingTableProps>) {
  return render(<StripePricingTable pricingTableId="mock-table-id" publishableKey="mock-publishable-key" {...props} />);
}

describe('StripePricingTable', () => {
  it('adds a script element to load Stripe', () => {
    tree();

    const script = document.querySelector('script');

    expect(script).toBeInTheDocument();
    expect(script).toHaveAttribute('src', 'https://js.stripe.com/v3/pricing-table.js');
    expect(script).toHaveAttribute('async', '');
  });

  it('removes the script element when unmounted', () => {
    const { unmount } = tree();

    expect(document.querySelector('script')).toBeInTheDocument();
    unmount();
    expect(document.querySelector('script')).not.toBeInTheDocument();
  });

  it('shows a stripe-pricing-table element with appropriate attributes', () => {
    tree({ clientReferenceId: 'mock-client-reference-id', customerEmail: 'mock-customer-email' });

    const table = document.querySelector('stripe-pricing-table');

    expect(table).toBeVisible();
    expect(table).toHaveAttribute('client-reference-id', 'mock-client-reference-id');
    expect(table).toHaveAttribute('customer-email', 'mock-customer-email');
    expect(table).toHaveAttribute('pricing-table-id', 'mock-table-id');
    expect(table).toHaveAttribute('publishable-key', 'mock-publishable-key');
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
