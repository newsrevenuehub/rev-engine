import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';

import useConnectStripeAccountMock from 'hooks/useConnectStripeAccount';

import Integration from './Integration';

jest.mock('hooks/useConnectStripeAccount', () => ({
  __esModule: true,
  default: jest.fn()
}));

describe('Settings Integration Page', () => {
  const useConnectStripeAccount = useConnectStripeAccountMock as jest.Mock;

  function tree() {
    return render(<Integration />);
  }

  beforeEach(() => {
    useConnectStripeAccount.mockReturnValue({
      requiresVerification: false
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

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
