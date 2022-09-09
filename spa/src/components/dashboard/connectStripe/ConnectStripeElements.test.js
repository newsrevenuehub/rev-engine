import { render, screen } from 'test-utils';

import ConnectStripeElements from './ConnectStripeElements';

const CONNECT_STRIPE_COOKIE_NAME = 'hideConnectStripeModal';

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
