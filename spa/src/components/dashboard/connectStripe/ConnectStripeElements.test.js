import { render, screen } from 'test-utils';
import { fireEvent } from '@testing-library/react';

import ConnectStripeElements from './ConnectStripeElements';
import useConnectStripeAccount from 'hooks/useConnectStripeAccount';
import { CONNECT_STRIPE_COOKIE_NAME, CONNECT_STRIPE_FAQ_LINK } from 'constants/textConstants';

jest.mock('hooks/useConnectStripeAccount');

describe('ConnectStripeElements', () => {
  it('should have enabled button for connectToStripe', () => {
    const mockSendUserToStripe = jest.fn();
    useConnectStripeAccount.mockReturnValue({
      loading: false,
      sendUserToStripe: mockSendUserToStripe
    });
    render(<ConnectStripeElements />);
    const connectToStripeButton = screen.getByRole('button', { name: 'Connect to Stripe' });
    expect(connectToStripeButton).toBeEnabled();
    fireEvent.click(connectToStripeButton);
    expect(mockSendUserToStripe).toHaveBeenCalled();
  });

  it('should disable the button for when hook is loading', () => {
    useConnectStripeAccount.mockReturnValue({
      loading: true,
      sendUserToStripe: () => {}
    });
    render(<ConnectStripeElements />);
    const connectToStripeButton = screen.getByRole('button', { name: 'Connect to Stripe' });
    expect(connectToStripeButton).toBeDisabled();
  });

  it('should show stripe-modal and stripe-toast should be hidden', () => {
    useConnectStripeAccount.mockReturnValue({
      loading: false,
      sendUserToStripe: () => {}
    });
    render(<ConnectStripeElements />);
    const stripeModal = screen.queryByTestId('connect-stripe-modal');
    expect(stripeModal).toBeInTheDocument();
    const stripeToast = screen.queryByTestId('connect-stripe-toast');
    expect(stripeToast).not.toBeInTheDocument();
  });

  it('renders a Stripe-FAQ-link that opens in a new tab', () => {
    useConnectStripeAccount.mockReturnValue({
      loading: false,
      sendUserToStripe: () => {}
    });
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
    const buttonText = 'Click me';
    useConnectStripeAccount.mockReturnValue({
      loading: false,
      sendUserToStripe: () => {},
      ctaButtonText: buttonText,
      unverifiedReason: 'past_due'
    });
    render(<ConnectStripeElements />);
    const connectNow = screen.getByRole('button', { name: buttonText });
    expect(connectNow).toBeEnabled();

    const stripeModal = screen.queryByTestId('connect-stripe-modal');
    expect(stripeModal).not.toBeInTheDocument();
    const stripeToast = screen.queryByTestId('connect-stripe-toast');
    expect(stripeToast).toBeInTheDocument();
  });
});
