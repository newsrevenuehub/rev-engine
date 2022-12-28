import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import userEvent from '@testing-library/user-event';

import useConnectStripeAccountMock from 'hooks/useConnectStripeAccount';
import useUserMock from 'hooks/useUser';

import Integration from './Integration';

jest.mock('hooks/useConnectStripeAccount', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('hooks/useUser', () => ({
  __esModule: true,
  default: jest.fn()
}));

describe('Settings Integration Page', () => {
  const useConnectStripeAccount = useConnectStripeAccountMock as jest.Mock;
  const useUser = useUserMock as jest.Mock;
  const sendUserToStripe = jest.fn();

  function tree() {
    return render(<Integration />);
  }

  beforeEach(() => {
    useUser.mockReturnValue({
      user: undefined
    });
    useConnectStripeAccount.mockReturnValue({
      requiresVerification: true,
      sendUserToStripe
    });
  });

  it('should render page texts', () => {
    tree();

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Integrations')).toBeInTheDocument();
    expect(screen.getByText('Connect News Revenue Engine to the tools you use every day.')).toBeInTheDocument();
  });

  test.each(['Stripe', 'Slack', 'Mailchimp', 'Salesforce'])('should render %p integration card', (title) => {
    tree();
    expect(screen.getByText(title)).toBeVisible();
  });

  it('should call sendUserToStripe', async () => {
    tree();
    expect(sendUserToStripe).not.toBeCalled();
    userEvent.click(screen.getByRole('checkbox', { name: 'Stripe is not connected' }));
    expect(sendUserToStripe).toBeCalledTimes(1);
  });

  it('should not call sendUserToStripe', async () => {
    useConnectStripeAccount.mockReturnValue({
      requiresVerification: false,
      sendUserToStripe
    });
    tree();
    expect(sendUserToStripe).not.toBeCalled();
    userEvent.click(screen.getByRole('checkbox', { name: 'Stripe is connected' }));
    expect(sendUserToStripe).not.toBeCalled();
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
