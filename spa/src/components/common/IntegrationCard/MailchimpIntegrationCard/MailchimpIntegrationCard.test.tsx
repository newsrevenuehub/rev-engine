import { PLAN_LABELS } from 'constants/orgPlanConstants';
import useConnectMailchimp from 'hooks/useConnectMailchimp';
import { render, screen } from 'test-utils';
import MailchimpIntegrationCard from './MailchimpIntegrationCard';

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
      connectedToMailchimp: false,
      hasMailchimpAccess: false,
      setRefetchInterval: jest.fn()
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
      connectedToMailchimp: true,
      hasMailchimpAccess: true,
      setRefetchInterval: jest.fn()
    });
    tree();

    expect(screen.getByTestId('isActive')).toHaveTextContent('true');
  });

  it('does not render an upgrade prompt while the organization is loading', () => {
    useConnectMailchimpMock.mockReturnValue({
      isLoading: true,
      isError: false,
      connectedToMailchimp: false,
      hasMailchimpAccess: false,
      setRefetchInterval: jest.fn()
    });
    tree();
    expect(screen.getByTestId('cornerMessage')).toBeEmptyDOMElement();
    expect(screen.getByTestId('isActive')).toHaveTextContent('false');
    expect(screen.getByRole('button', { name: 'connect' })).toBeDisabled();
  });

  describe('Free plan', () => {
    it.each([[undefined], [PLAN_LABELS.FREE]])(
      'renders mailchimp card for "%s" organization plan',
      (organizationPlan) => {
        useConnectMailchimpMock.mockReturnValue({
          isLoading: false,
          isError: false,
          connectedToMailchimp: false,
          organizationPlan: organizationPlan as any,
          hasMailchimpAccess: true,
          setRefetchInterval: jest.fn()
        });
        tree();
        expect(screen.getByTestId('cornerMessage')).toHaveTextContent('Upgrade to Core');
        expect(screen.getByTestId('isActive')).toHaveTextContent('false');
        expect(screen.getByRole('button', { name: 'connect' })).toBeDisabled();
      }
    );
  });

  describe('Paid plan', () => {
    it.each([[PLAN_LABELS.CORE], [PLAN_LABELS.PLUS]])(
      'renders mailchimp card for "%s" organization plan',
      (organizationPlan) => {
        useConnectMailchimpMock.mockReturnValue({
          isLoading: false,
          isError: false,
          connectedToMailchimp: false,
          organizationPlan: organizationPlan as any,
          hasMailchimpAccess: true,
          sendUserToMailchimp: jest.fn(),
          setRefetchInterval: jest.fn()
        });
        tree();
        expect(screen.getByTestId('cornerMessage')).toBeEmptyDOMElement();
        expect(screen.getByTestId('isActive')).toHaveTextContent('false');
        expect(screen.getByRole('button', { name: 'connect' })).toBeEnabled();
      }
    );

    it.each([[PLAN_LABELS.CORE], [PLAN_LABELS.PLUS]])(
      'calls "sendUserToMailchimp" mailchimp card for "%s" organization plan',
      (organizationPlan) => {
        const sendUserToMailchimp = jest.fn();
        useConnectMailchimpMock.mockReturnValue({
          isLoading: false,
          isError: false,
          connectedToMailchimp: false,
          organizationPlan: organizationPlan as any,
          sendUserToMailchimp,
          hasMailchimpAccess: true,
          setRefetchInterval: jest.fn()
        });
        tree();
        expect(sendUserToMailchimp).not.toBeCalled();
        screen.getByRole('button', { name: 'connect' }).click();
        expect(sendUserToMailchimp).toBeCalledTimes(1);
      }
    );
  });
});
