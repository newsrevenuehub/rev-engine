import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import userEvent from '@testing-library/user-event';

import useConnectStripeAccount from 'hooks/useConnectStripeAccount';
import useUser from 'hooks/useUser';

import Integration from './Integration';

jest.mock('components/settings/Integration/IntegrationCard/MailchimpIntegrationCard', () => ({
  MailchimpIntegrationCard: () => <div data-testid="mock-mailchimp-card">Mailchimp</div>
}));
jest.mock('hooks/useConnectStripeAccount');
jest.mock('hooks/useUser');

describe('Settings Integration Page', () => {
  const useConnectStripeAccountMock = useConnectStripeAccount as jest.Mock;
  const useUserMock = useUser as jest.Mock;
  const sendUserToStripe = jest.fn();

  function tree() {
    return render(<Integration />);
  }

  beforeEach(() => {
    useUserMock.mockReturnValue({
      user: {
        organizations: [{ id: 'mock-org' }]
      },
      isLoading: false
    });
    useConnectStripeAccountMock.mockReturnValue({
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

  test.each([
    'Stripe',
    'Slack',
    'Mailchimp',
    'Salesforce',
    'Eventbrite',
    'digestbuilder',
    'Google Analytics',
    'Newspack'
  ])('should render %p integration card', (title) => {
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
    useConnectStripeAccountMock.mockReturnValue({
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
