import { render, screen } from 'test-utils';
import { fireEvent } from '@testing-library/react';
import ConnectStripeElements from './ConnectStripeElements';
import useConnectStripeAccount from 'hooks/useConnectStripeAccount';
import { CONNECT_STRIPE_COOKIE_NAME, CONNECT_STRIPE_FAQ_LINK } from 'constants/textConstants';
import { useCookies } from 'react-cookie';

jest.mock('hooks/useConnectStripeAccount');
jest.mock('react-cookie');

describe('ConnectStripeElements', () => {
  const useConnectStripeAccountMock = useConnectStripeAccount as jest.Mock;
  const useCookiesMock = useCookies as jest.Mock;

  beforeEach(() => {
    useCookiesMock.mockReturnValue([{}, jest.fn()]);
    useConnectStripeAccountMock.mockReturnValue({
      isLoading: false,
      sendUserToStripe: jest.fn()
    });
  });

  it('includes step information for users of assistive technology', () => {
    render(<ConnectStripeElements />);
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
  });

  it('should have enabled button for connectToStripe', () => {
    const sendUserToStripe = jest.fn();

    useConnectStripeAccountMock.mockReturnValue({
      sendUserToStripe,
      isLoading: false
    });
    render(<ConnectStripeElements />);

    const connectToStripeButton = screen.getByRole('button', { name: 'Connect to Stripe' });

    expect(connectToStripeButton).toBeEnabled();
    fireEvent.click(connectToStripeButton);
    expect(sendUserToStripe).toHaveBeenCalled();
  });

  it('should disable the button for when hook is loading', () => {
    useConnectStripeAccountMock.mockReturnValue({
      isLoading: true,
      sendUserToStripe: () => {}
    });
    render(<ConnectStripeElements />);

    const connectToStripeButton = screen.getByRole('button', { name: 'Connect to Stripe' });

    expect(connectToStripeButton).toBeDisabled();
  });

  it('should show stripe-modal and stripe-toast should be hidden', () => {
    render(<ConnectStripeElements />);
    expect(screen.getByTestId('connect-stripe-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('connect-stripe-toast')).not.toBeInTheDocument();
  });

  it('renders a Stripe-FAQ-link that opens in a new tab', () => {
    render(<ConnectStripeElements />);

    const faqLink = screen.getByText('Stripe Connection FAQ');

    expect(faqLink).toBeVisible();
    expect(faqLink).toHaveAttribute('href', CONNECT_STRIPE_FAQ_LINK);
    expect(faqLink).toHaveAttribute('target', '_blank');
  });

  describe("When the user's Stripe account is not verified", () => {
    it('should show stripe-toast and stripe-modal should be hidden', () => {
      useCookiesMock.mockReturnValue([{ [CONNECT_STRIPE_COOKIE_NAME]: true }, jest.fn()]);
      useConnectStripeAccountMock.mockReturnValue({
        isLoading: false,
        sendUserToStripe: () => {},
        unverifiedReason: 'past_due'
      });
      render(<ConnectStripeElements />);
      expect(screen.getByRole('button', { name: 'Take me to Stripe' })).toBeEnabled();
      expect(screen.queryByTestId('connect-stripe-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('connect-stripe-toast')).toBeInTheDocument();
    });
  });

  describe('cookie behavior', () => {
    it('should set the appropriate cookie when connect later', () => {
      const setCookie = jest.fn();

      useCookiesMock.mockReturnValue([{}, setCookie]);
      useConnectStripeAccountMock.mockReturnValue({
        isLoading: false,
        sendUserToStripe: () => {},
        unverifiedReason: 'past_due'
      });
      render(<ConnectStripeElements />);

      const connectLater = screen.getByText('I’ll connect to Stripe later');

      fireEvent.click(connectLater);
      expect(setCookie.mock.calls).toEqual([[CONNECT_STRIPE_COOKIE_NAME, true, { path: '/' }]]);
    });

    it('should set the appropriate cookie when connect now', () => {
      const setCookie = jest.fn();

      useCookiesMock.mockReturnValue([{}, setCookie]);
      useConnectStripeAccountMock.mockReturnValue({
        isLoading: false,
        sendUserToStripe: () => {},
        unverifiedReason: 'past_due'
      });
      render(<ConnectStripeElements />);
      const connectLater = screen.getByText('I’ll connect to Stripe later');
      fireEvent.click(connectLater);
      expect(setCookie.mock.calls).toEqual([[CONNECT_STRIPE_COOKIE_NAME, true, { path: '/' }]]);
    });
  });
});
