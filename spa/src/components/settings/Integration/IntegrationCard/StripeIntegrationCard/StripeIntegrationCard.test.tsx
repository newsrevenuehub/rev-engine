import { render, screen } from 'test-utils';
import StripeIntegrationCard from './StripeIntegrationCard';
import useConnectStripeAccount from 'hooks/useConnectStripeAccount';

jest.mock('../IntegrationCard');
jest.mock('hooks/useConnectStripeAccount');

describe('StripeIntegrationCard', () => {
  const hideConnectionSuccess = jest.fn();
  const useConnectStripeAccountMock = jest.mocked(useConnectStripeAccount);
  function tree() {
    return render(<StripeIntegrationCard />);
  }

  beforeEach(() => {
    useConnectStripeAccountMock.mockReturnValue({
      hideConnectionSuccess,
      isLoading: false,
      isError: false,
      displayConnectionSuccess: false,
      requiresVerification: true
    });
  });

  it('renders integration card', () => {
    tree();
    expect(screen.getByTestId('mock-integration-card')).toBeVisible();
  });

  it('renders connected integration card', () => {
    useConnectStripeAccountMock.mockReturnValue({
      hideConnectionSuccess,
      isLoading: false,
      isError: false,
      displayConnectionSuccess: false,
      requiresVerification: false
    });
    tree();

    expect(screen.getByTestId('isActive')).toHaveTextContent('true');
  });

  it('calls "sendUserToStripe" mailchimp card for "%s" organization plan', () => {
    const sendUserToStripe = jest.fn();
    useConnectStripeAccountMock.mockReturnValue({
      hideConnectionSuccess,
      isLoading: false,
      isError: false,
      displayConnectionSuccess: false,
      requiresVerification: true,
      sendUserToStripe
    });
    tree();
    expect(sendUserToStripe).not.toBeCalled();
    screen.getByRole('button', { name: 'connect' }).click();
    expect(sendUserToStripe).toBeCalledTimes(1);
  });
});
