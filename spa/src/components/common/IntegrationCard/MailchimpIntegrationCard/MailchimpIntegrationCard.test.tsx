import { render, screen } from 'test-utils';
import MailchimpIntegrationCard from './MailchimpIntegrationCard';
import useConnectMailchimp from 'hooks/useConnectMailchimp';

jest.mock('../IntegrationCard');
jest.mock('hooks/useConnectMailchimp');

describe('MailchimpIntegrationCard', () => {
  const useConnectMailchimpMock = jest.mocked(useConnectMailchimp);
  function tree() {
    return render(<MailchimpIntegrationCard />);
  }

  beforeEach(() => {
    useConnectMailchimpMock.mockReturnValue({
      isLoading: false,
      isError: false,
      connectedToMailchimp: false
    });
  });

  it('renders integration card', () => {
    tree();
    expect(screen.getByTestId('mock-integration-card')).toBeVisible();
  });

  it('renders connected integration card', () => {
    useConnectMailchimpMock.mockReturnValue({
      isLoading: false,
      isError: false,
      connectedToMailchimp: true
    });
    tree();

    expect(screen.getByTestId('isActive')).toHaveTextContent('true');
  });

  describe('Free plan', () => {
    it.each([
      [undefined],
      // TODO: use constant file after DEV-3330 is merged
      ['FREE']
    ])('renders mailchimp card for "%s" organization plan', (organizationPlan) => {
      useConnectMailchimpMock.mockReturnValue({
        isLoading: false,
        isError: false,
        connectedToMailchimp: false,
        organizationPlan: organizationPlan as any
      });
      tree();
      expect(screen.getByTestId('cornerMessage')).toHaveTextContent('Upgrade to Core');
      expect(screen.getByTestId('isActive')).toHaveTextContent('false');
      expect(screen.getByRole('button', { name: 'connect' })).toBeDisabled();
    });
  });

  describe('Paid plan', () => {
    it.each([
      // TODO: use constant file after DEV-3330 is merged
      ['CORE'],
      ['PLUS']
    ])('renders mailchimp card for "%s" organization plan', (organizationPlan) => {
      useConnectMailchimpMock.mockReturnValue({
        isLoading: false,
        isError: false,
        connectedToMailchimp: false,
        organizationPlan: organizationPlan as any
      });
      tree();
      expect(screen.getByTestId('cornerMessage')).toHaveTextContent('');
      expect(screen.getByTestId('isActive')).toHaveTextContent('false');
      expect(screen.getByRole('button', { name: 'connect' })).toBeEnabled();
    });

    it.each([
      // TODO: use constant file after DEV-3330 is merged
      ['CORE'],
      ['PLUS']
    ])('calls "sendUserToMailchimp" mailchimp card for "%s" organization plan', (organizationPlan) => {
      const sendUserToMailchimp = jest.fn();
      useConnectMailchimpMock.mockReturnValue({
        isLoading: false,
        isError: false,
        connectedToMailchimp: false,
        organizationPlan: organizationPlan as any,
        sendUserToMailchimp
      });
      tree();
      expect(sendUserToMailchimp).not.toBeCalled();
      screen.getByRole('button', { name: 'connect' }).click();
      expect(sendUserToMailchimp).toBeCalledTimes(1);
    });
  });
});
