import { PLAN_LABELS, PLAN_NAMES } from 'constants/orgPlanConstants';
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
    it.each([[undefined], [PLAN_NAMES.FREE]])(
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
        expect(screen.getByTestId('cornerMessage')).toHaveTextContent('Core Feature');
        expect(screen.getByTestId('isActive')).toHaveTextContent('false');
        expect(screen.getByRole('button', { name: 'connect' })).toBeDisabled();
      }
    );

    describe('Upgrade button', () => {
      beforeEach(() => {
        useConnectMailchimpMock.mockReturnValue({
          isLoading: false,
          isError: false,
          connectedToMailchimp: false,
          organizationPlan: PLAN_NAMES.FREE,
          hasMailchimpAccess: true,
          setRefetchInterval: jest.fn()
        });
      });

      it('should render Upgrade button for "Free" organization plan', () => {
        tree();
        expect(screen.getByRole('button', { name: /Upgrade/i })).toBeEnabled();
      });

      it('should link "Upgrade" button to the subscription route if the user has the self-upgrade feature flag', () => {
        tree();
        expect(screen.getByRole('button', { name: /Upgrade/i })).toHaveAttribute('href', '/settings/subscription');
      });
    });
  });

  describe.each([[PLAN_LABELS.CORE], [PLAN_LABELS.PLUS]])(`%s plan`, (organizationPlan) => {
    const sendUserToMailchimp = jest.fn();

    beforeEach(() => {
      useConnectMailchimpMock.mockReturnValue({
        isLoading: false,
        isError: false,
        connectedToMailchimp: false,
        organizationPlan: organizationPlan as any,
        sendUserToMailchimp,
        hasMailchimpAccess: true,
        setRefetchInterval: jest.fn()
      });
    });

    it('renders mailchimp card', () => {
      tree();
      expect(screen.getByTestId('cornerMessage')).toBeEmptyDOMElement();
      expect(screen.getByTestId('isActive')).toHaveTextContent('false');
      expect(screen.getByRole('button', { name: 'connect' })).toBeEnabled();
    });

    it('calls sendUserToMailchimp when the connect button is clicked', () => {
      tree();
      expect(sendUserToMailchimp).not.toBeCalled();
      screen.getByRole('button', { name: 'connect' }).click();
      expect(sendUserToMailchimp).toBeCalledTimes(1);
    });

    it('should not render Upgrade button (rightAction)', () => {
      tree();
      expect(screen.queryByText('Upgrade')).not.toBeInTheDocument();
      expect(screen.queryByTestId('rightAction')).not.toBeInTheDocument();
    });
  });
});
