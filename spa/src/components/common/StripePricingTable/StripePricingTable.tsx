import PropTypes, { InferProps } from 'prop-types';
import { useEffect } from 'react';

// Make TypeScript aware that <stripe-pricing-table> is a valid HTML element.

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

const StripePricingTablePropTypes = {
  /**
   * A reference ID that will be attached to the checkout. It's not used by
   * Stripe itself.
   */
  clientReferenceId: PropTypes.string,
  /**
   * Prepopulates the email field when the user checks out.
   */
  customerEmail: PropTypes.string,
  /**
   * Stripe-provided ID of the pricing table.
   */
  pricingTableId: PropTypes.string.isRequired,
  /**
   * Stripe-provided publishable API key for the pricing table.
   */
  publishableKey: PropTypes.string.isRequired
};

export type StripePricingTableProps = InferProps<typeof StripePricingTablePropTypes>;

/**
 * A Stripe-powered pricing table.
 * @see https://stripe.com/docs/payments/checkout/pricing-table
 */
export function StripePricingTable({
  clientReferenceId,
  customerEmail,
  pricingTableId,
  publishableKey
}: StripePricingTableProps) {
  useEffect(() => {
    const script = document.createElement('script');

    script.setAttribute('async', '');
    script.setAttribute('src', 'https://js.stripe.com/v3/pricing-table.js');
    document.body.appendChild(script);
    return () => script.remove();
  }, []);

  return (
    <stripe-pricing-table
      client-reference-id={clientReferenceId}
      customer-email={customerEmail}
      pricing-table-id={pricingTableId}
      publishable-key={publishableKey}
    ></stripe-pricing-table>
  );
}

StripePricingTable.propTypes = StripePricingTablePropTypes;
export default StripePricingTable;
