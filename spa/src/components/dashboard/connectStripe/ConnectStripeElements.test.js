import { render, screen } from 'test-utils';
import { fireEvent } from '@testing-library/react';
import ConnectStripeElements from './ConnectStripeElements';
import useConnectStripeAccount from 'hooks/useConnectStripeAccount';
import { CONNECT_STRIPE_COOKIE_NAME, CONNECT_STRIPE_FAQ_LINK } from 'constants/textConstants';

jest.mock('hooks/useConnectStripeAccount');
const mockSetCookie = jest.fn();
jest.mock('react-cookie', () => ({
  __esModule: true,
  ...jest.requireActual(),
  useCookies: () => [jest.fn(), mockSetCookie]
}));

describe('ConnectStripeElements', () => {
  it('includes step information for users of assistive technology', () => {
    useConnectStripeAccount.mockReturnValue({
      isLoading: false,
      sendUserToStripe: () => {}
    });
    render(<ConnectStripeElements />);
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
  });

  it('should have enabled button for connectToStripe', () => {
    const mockSendUserToStripe = jest.fn();
    useConnectStripeAccount.mockReturnValue({
      isLoading: false,
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
      isLoading: true,
      sendUserToStripe: () => {}
    });
    render(<ConnectStripeElements />);
    const connectToStripeButton = screen.getByRole('button', { name: 'Connect to Stripe' });
    expect(connectToStripeButton).toBeDisabled();
  });

  it('should show stripe-modal and stripe-toast should be hidden', () => {
    useConnectStripeAccount.mockReturnValue({
      isLoading: false,
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
      isLoading: false,
      sendUserToStripe: () => {}
    });
    render(<ConnectStripeElements />);
    const faqLink = screen.getByText('Stripe Connection FAQ');
    expect(faqLink).toBeVisible();
    expect(faqLink).toHaveAttribute('href', CONNECT_STRIPE_FAQ_LINK);
    expect(faqLink).toHaveAttribute('target', '_blank');
  });
});

describe.only('Show Toast if cookie is set', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: `${CONNECT_STRIPE_COOKIE_NAME}=true`
    });
  });

  it('should show stripe-toast and stripe-modal should be hidden', () => {
    useConnectStripeAccount.mockReturnValue({
      isLoading: false,
      sendUserToStripe: () => {},
      unverifiedReason: 'past_due'
    });
    render(<ConnectStripeElements />);
    const connectNow = screen.getByRole('button', { name: 'Take me to Stripe' });
    expect(connectNow).toBeEnabled();

    const stripeModal = screen.queryByTestId('connect-stripe-modal');
    expect(stripeModal).not.toBeInTheDocument();
    const stripeToast = screen.queryByTestId('connect-stripe-toast');
    expect(stripeToast).toBeInTheDocument();
  });
});

describe('When user decides to connect to Stripe later', () => {
  it('should set the appropriate cookie', () => {
    useConnectStripeAccount.mockReturnValue({
      isLoading: false,
      sendUserToStripe: () => {},
      unverifiedReason: 'past_due'
    });
    render(<ConnectStripeElements />);
    const connectLater = screen.getByText('I’ll connect to Stripe later');
    fireEvent.click(connectLater);
    expect(mockSetCookie).toHaveBeenCalledTimes(1);
    expect(mockSetCookie.mock.calls[0]).toEqual([CONNECT_STRIPE_COOKIE_NAME, true, { path: '/' }]);
  });
});
