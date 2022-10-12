import { render, screen, fireEvent } from 'test-utils';
import ConnectStripeToast, { USER_ACTION_REQUIRED_MESSAGE, PENDING_VERIFICATION_MESSAGE } from './ConnectStripeToast';
import useConnectStripeAccount from 'hooks/useConnectStripeAccount';

jest.mock('hooks/useConnectStripeAccount');

describe('ConnectStripeToast', () => {
  test('should have a button when verification reason is "past_due"', () => {
    const mockSendUsertoStripe = jest.fn();
    useConnectStripeAccount.mockReturnValue({
      loading: false,
      requiresVerification: true,
      unverifiedReason: 'past_due',
      sendUserToStripe: mockSendUsertoStripe
    });
    render(<ConnectStripeToast />);
    expect(screen.getByText(USER_ACTION_REQUIRED_MESSAGE)).toBeInTheDocument();
    const connectToStripeButton = screen.getByRole('button', { name: 'Take me to Stripe' });
    expect(connectToStripeButton).toBeEnabled();
    fireEvent.click(connectToStripeButton);
    expect(mockSendUsertoStripe).toHaveBeenCalled();
  });

  test('should disable button when hook is loading', () => {
    useConnectStripeAccount.mockReturnValue({
      loading: true,
      requiresVerification: true,
      unverifiedReason: 'past_due',
      sendUserToStripe: () => {}
    });
    render(<ConnectStripeToast />);
    const connectToStripeButton = screen.getByRole('button', { name: 'Take me to Stripe' });
    expect(connectToStripeButton).toBeDisabled();
  });

  test('should have a disabled button when verification reason is not "past_due"', () => {
    useConnectStripeAccount.mockReturnValue({
      loading: false,
      requiresVerification: true,
      unverifiedReason: 'pending_verification',
      sendUserToStripe: () => {}
    });
    render(<ConnectStripeToast />);
    expect(screen.getByText(PENDING_VERIFICATION_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeDisabled();
  });

  test('should show the expanded view by default', () => {
    useConnectStripeAccount.mockReturnValue({
      loading: false,
      requiresVerification: true,
      unverifiedReason: 'past_due',
      sendUserToStripe: () => {}
    });
    render(<ConnectStripeToast />);
    const stripeToast = screen.queryByTestId('connect-stripe-toast');
    expect(stripeToast).toBeInTheDocument();
  });

  test('should collapse the toast on click of minimize', () => {
    useConnectStripeAccount.mockReturnValue({
      loading: false,
      requiresVerification: true,
      unverifiedReason: 'past_due',
      sendUserToStripe: () => {}
    });
    render(<ConnectStripeToast />);
    const stripeToast = screen.queryByTestId('connect-stripe-toast');
    expect(stripeToast).toBeInTheDocument();
    fireEvent.click(screen.queryByTestId('minimize-toast'));
    const stripeToastCollapsed = screen.queryByTestId('connect-stripe-toast-collapsed');
    expect(stripeToastCollapsed).toBeInTheDocument();
  });

  test('should expand toast on click of minimized toast', () => {
    useConnectStripeAccount.mockReturnValue({
      loading: false,
      requiresVerification: true,
      unverifiedReason: 'past_due',
      sendUserToStripe: () => {}
    });
    render(<ConnectStripeToast />);
    const stripeToast = screen.queryByTestId('connect-stripe-toast');
    expect(stripeToast).toBeInTheDocument();
    fireEvent.click(screen.queryByTestId('minimize-toast'));
    const stripeToastCollapsed = screen.queryByTestId('connect-stripe-toast-collapsed');
    expect(stripeToastCollapsed).toBeInTheDocument();
    fireEvent.click(stripeToastCollapsed);
    const stripeToastExpanded = screen.queryByTestId('connect-stripe-toast');
    expect(stripeToastExpanded).toBeInTheDocument();
  });
});
