import { render, screen, fireEvent } from 'test-utils';

import ConnectStripeToast from './ConnectStripeToast';
describe('ConnectStripeToast', () => {
  test('should have the Connect Now Button', () => {
    render(<ConnectStripeToast createStripeAccountLinkMutation={{ isLoading: false }} />);
    const connectToStripeButton = screen.getByRole('button', { name: 'Connect Now' });
    expect(connectToStripeButton).toBeEnabled();
  });

  test('should show the expanded view by default', () => {
    render(<ConnectStripeToast createStripeAccountLinkMutation={{ isLoading: false }} />);
    const stripeToast = screen.queryByTestId('connect-stripe-toast');
    expect(stripeToast).toBeInTheDocument();
  });

  test('should collapse the toast on click of minimize', () => {
    render(<ConnectStripeToast createStripeAccountLinkMutation={{ isLoading: false }} />);
    const stripeToast = screen.queryByTestId('connect-stripe-toast');
    expect(stripeToast).toBeInTheDocument();
    fireEvent.click(screen.queryByTestId('minimize-toast'));
    const stripeToastCollapsed = screen.queryByTestId('connect-stripe-toast-collapsed');
    expect(stripeToastCollapsed).toBeInTheDocument();
  });

  test('should expand toast on click of minimized toast', () => {
    render(<ConnectStripeToast createStripeAccountLinkMutation={{ isLoading: false }} />);
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
