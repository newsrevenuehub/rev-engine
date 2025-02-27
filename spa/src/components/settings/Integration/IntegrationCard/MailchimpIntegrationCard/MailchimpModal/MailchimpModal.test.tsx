import { axe } from 'jest-axe';
import { useSnackbar } from 'notistack';
import { DONATIONS_SLUG, SETTINGS } from 'routes';
import { fireEvent, render, screen } from 'test-utils';
import MailchimpModal, { MailchimpModalProps } from './MailchimpModal';

jest.mock('../../IntegrationCardHeader/IntegrationCardHeader');

jest.mock('notistack', () => ({
  ...jest.requireActual('notistack'),
  useSnackbar: jest.fn()
}));

const onClose = jest.fn();
const useSnackbarMock = jest.mocked(useSnackbar);

const defaultProps = {
  open: true,
  onClose,
  isActive: false,
  isRequired: false,
  cornerMessage: 'mock-corner-message',
  title: 'mock-title',
  image: 'mock-image',
  site: {
    label: 'mock-label',
    url: 'mock-url'
  },
  organizationPlan: 'FREE' as any,
  user: {
    flags: []
  } as any
};

describe('MailchimpModal', () => {
  function tree(props?: Partial<MailchimpModalProps>) {
    return render(<MailchimpModal {...defaultProps} {...props} />);
  }

  beforeEach(() => {
    useSnackbarMock.mockReturnValue({ enqueueSnackbar: jest.fn(), closeSnackbar: jest.fn() });
  });

  describe('FREE plan', () => {
    it('should render bullet points', () => {
      tree();
      expect(screen.getByText('Regularly thank, steward and bump up current contributors.')).toBeVisible();
      expect(screen.getByText('Re-engage lapsed donors.')).toBeVisible();
      expect(
        screen.getByText('Consistently market to new contributors, segmenting out those who already gave.')
      ).toBeVisible();
    });

    it('should show upgrade prompt', () => {
      tree();
      expect(screen.getByText(/Upgrade for integrated email marketing and more features!/i)).toBeVisible();
      expect(screen.getByRole('link', { name: 'Learn More' })).toHaveAttribute(
        'href',
        // PRICING_URL constant. Link is hardcoded so that if constant is mistakenly changed the test will fail
        'https://fundjournalism.org/pricing/'
      );
    });

    it('should render action buttons', () => {
      tree();
      expect(screen.getByRole('button', { name: /Upgrade/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /Maybe later/i })).toBeEnabled();
    });

    it('should link "Upgrade" button to the subscription route', () => {
      tree();
      expect(screen.getByRole('button', { name: /Upgrade/i })).toHaveAttribute('href', SETTINGS.SUBSCRIPTION);
    });

    it('should call onClose when the Maybe Later button is clicked', () => {
      tree();

      const cancelButton = screen.getByRole('button', { name: /Maybe later/i });
      expect(cancelButton).toBeEnabled();

      fireEvent.click(cancelButton);
      expect(onClose).toHaveBeenCalled();
    });

    it('should be accessible', async () => {
      const { container } = tree();
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe.each(['CORE', 'PLUS'] as MailchimpModalProps['organizationPlan'][])('%s plan', (plan) => {
    describe('Mailchimp is not connected', () => {
      it('should render integration card header', () => {
        const headerProps = {
          isActive: false,
          title: 'mock-title',
          image: 'mock-image',
          isRequired: true,
          cornerMessage: 'mock-corner-message',
          site: {
            label: 'mock-label',
            url: 'mock-url'
          }
        };
        tree({ organizationPlan: plan, ...headerProps });
        expect(screen.getByTestId('mock-integration-card-header')).toBeVisible();
        expect(screen.getByTestId('mock-integration-card-header-props')).toHaveTextContent(JSON.stringify(headerProps));
      });

      it('should not render "successfully connected" header', () => {
        tree({ organizationPlan: plan });
        expect(screen.queryByText(/Successfully Connected!/i)).not.toBeInTheDocument();
      });

      it('should render bullet points', () => {
        tree({ organizationPlan: plan });
        expect(screen.getByText('Integrate with Mailchimp to', { exact: false })).toBeVisible();
        expect(screen.getByText('automate targeted', { exact: false })).toBeVisible();
        expect(screen.getByText('emails.', { exact: false })).toBeVisible();
        expect(screen.getByText('Regularly thank, steward and bump up current contributors.')).toBeVisible();
        expect(screen.getByText('Re-engage lapsed donors.')).toBeVisible();
        expect(
          screen.getByText('Consistently market to new contributors, segmenting out those who already gave.')
        ).toBeVisible();
      });

      it('should render action buttons', () => {
        tree({ organizationPlan: plan });
        expect(screen.getByRole('button', { name: /Connect/i })).toBeEnabled();
        expect(screen.getByRole('button', { name: /Maybe later/i })).toBeEnabled();
      });

      it('should call "sendUserToMailchimp" when "Connect" button is clicked', () => {
        const sendUserToMailchimp = jest.fn();
        tree({ organizationPlan: plan, sendUserToMailchimp });
        expect(sendUserToMailchimp).not.toHaveBeenCalled();
        screen.getByRole('button', { name: /Connect/i }).click();
        expect(sendUserToMailchimp).toHaveBeenCalledTimes(1);
      });

      it('should call onClose', () => {
        tree({ organizationPlan: plan });
        expect(onClose).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: /Maybe later/i }));
        expect(onClose).toHaveBeenCalledTimes(1);
      });

      it('should render "see support" section', () => {
        tree({ organizationPlan: plan });
        expect(screen.getByText(/For more integration details and tips contact/i)).toBeVisible();
        expect(screen.getByRole('link', { name: /support/i })).toHaveAttribute(
          'href',
          // HELP_URL constant. Link is hardcoded so that if constant is mistakenly changed the test will fail
          'https://fundjournalism.org/news-revenue-engine-help/'
        );
      });

      it('should be accessible', async () => {
        const { container } = tree({ organizationPlan: plan });
        expect(await axe(container)).toHaveNoViolations();
      });
    });

    describe('Mailchimp is connected', () => {
      it('should not render integration card header', () => {
        tree({ organizationPlan: plan, isActive: true });
        expect(screen.queryByTestId('mock-integration-card-header')).not.toBeInTheDocument();
      });

      it('should render "successfully connected" header', () => {
        tree({ organizationPlan: plan, isActive: true });
        expect(screen.getByText(/Successfully Connected!/i)).toBeInTheDocument();
      });

      it('should render texts', () => {
        tree({ organizationPlan: plan, isActive: true });
        expect(screen.getByText('What’s Next?')).toBeVisible();
        expect(
          screen.getByText(
            'You can now send email campaigns to your RevEngine contributors without manually importing or exporting their contact information.'
          )
        ).toBeVisible();
        expect(
          screen.getByText(
            'Create and automate targeted emails with pre-populated segments based on a contributor’s activity.'
          )
        ).toBeVisible();
        expect(screen.getByText('You can track contributor engagement from the moment they give.')).toBeVisible();
      });

      it('should render action buttons', () => {
        tree({ organizationPlan: plan, isActive: true });
        const closeButtons = screen.getAllByRole('button', { name: /close/i });
        expect(closeButtons).toHaveLength(2);
        closeButtons.forEach((button) => expect(button).toBeEnabled());
        expect(screen.getByRole('button', { name: /Go to contributions/i })).toBeEnabled();
      });

      it('should render a "Go to contributions" button that links to the contributions route', () => {
        expect(onClose).not.toHaveBeenCalled();
        tree({ organizationPlan: plan, isActive: true });

        const button = screen.getByRole('button', { name: 'Go to contributions' });

        expect(button).toBeVisible();
        expect(button).toHaveAttribute('href', DONATIONS_SLUG);
      });

      it('should render "FAQ" section', () => {
        tree({ organizationPlan: plan, isActive: true });
        expect(screen.getByText('Need more help?', { exact: false })).toBeVisible();
        expect(screen.getByText('Check our', { exact: false })).toBeVisible();
        expect(screen.getByText(/for more integration details and tips./i)).toBeVisible();
        expect(screen.getByRole('link', { name: /FAQ/i })).toHaveAttribute(
          'href',
          // FAQ_URL constant. Link is hardcoded so that if constant is mistakenly changed the test will fail
          'https://news-revenue-hub.atlassian.net/servicedesk/customer/portal/11/article/2195423496'
        );
      });

      it('should be accessible', async () => {
        const { container } = tree({ organizationPlan: plan, isActive: true });
        expect(await axe(container)).toHaveNoViolations();
      });
    });
  });
});
