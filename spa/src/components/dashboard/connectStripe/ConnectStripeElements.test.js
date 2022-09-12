import { render, screen } from 'test-utils';

import ConnectStripeElements from './ConnectStripeElements';

import { CONNECT_STRIPE_COOKIE_NAME, CONNECT_STRIPE_FAQ_LINK } from 'constants/textConstants';

describe('ConnectStripeElements', () => {
  test('should have enabled button for connectToStripe', () => {
    render(<ConnectStripeElements />);
    const connectToStripeButton = screen.getByRole('button', { name: 'Connect to Stripe' });
    expect(connectToStripeButton).toBeEnabled();
  });

  test('should show stripe-modal and stripe-toast should be hidden', () => {
    render(<ConnectStripeElements />);
    const stripeModal = screen.queryByTestId('connect-stripe-modal');
    expect(stripeModal).toBeInTheDocument();
    const stripeToast = screen.queryByTestId('connect-stripe-toast');
    expect(stripeToast).not.toBeInTheDocument();
  });

  test('renders a Stripe-FAQ-link that opens in a new tab', () => {
    render(<ConnectStripeElements />);
    const faqLink = screen.getByText('Stripe Connection FAQ');
    expect(faqLink).toBeVisible();
    expect(faqLink).toHaveAttribute('href', CONNECT_STRIPE_FAQ_LINK);
    expect(faqLink).toHaveAttribute('target', '_blank');
  });
});

describe('Show Toast if cookie is set', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: `${CONNECT_STRIPE_COOKIE_NAME}=true`
    });
  });

  it('should show stripe-toast and stripe-modal should be hidden', () => {
    render(<ConnectStripeElements />);
    const connectNow = screen.getByRole('button', { name: 'Connect Now' });
    expect(connectNow).toBeEnabled();

    const stripeModal = screen.queryByTestId('connect-stripe-modal');
    expect(stripeModal).not.toBeInTheDocument();
    const stripeToast = screen.queryByTestId('connect-stripe-toast');
    expect(stripeToast).toBeInTheDocument();
  });
});
