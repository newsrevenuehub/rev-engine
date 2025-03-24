import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import ActiveCampaignModal, { ActiveCampaignModalProps } from './ActiveCampaignModal';
import { ACTIVECAMPAIGN_HOME_URL } from 'constants/helperUrls';
import { EnginePlan } from 'hooks/useContributionPage';

jest.mock('./FreePlanContent');
jest.mock('./PaidPlanContent');

function tree(props?: Partial<ActiveCampaignModalProps>) {
  return render(
    <ActiveCampaignModal onClose={jest.fn()} onStartConnection={jest.fn()} open orgPlan="FREE" {...props} />
  );
}

describe('ActiveCampaignModal', () => {
  it('shows nothing if not open', () => {
    tree({ open: false });
    expect(document.body.textContent).toBe('');
  });

  describe('When open', () => {
    it('shows a modal', () => {
      tree();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('shows a link to ActiveCampaign', () => {
      tree();
      expect(screen.getByRole('link', { name: 'activecampaign.com' })).toHaveAttribute('href', ACTIVECAMPAIGN_HOME_URL);
    });

    it('calls the onClose prop when the modal is closed', () => {
      const onClose = jest.fn();

      tree({ onClose });
      expect(onClose).not.toBeCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(onClose).toBeCalledTimes(1);
    });

    describe("When the user's org is on the Free plan", () => {
      it('shows <FreePlanContent>', () => {
        tree({ orgPlan: 'FREE' });
        expect(screen.getByTestId('mock-free-plan-content')).toBeInTheDocument();
      });

      it('calls the onClose prop if <FreePlanContent> asks for it', () => {
        const onClose = jest.fn();

        tree({ onClose });
        expect(onClose).not.toBeCalled();
        fireEvent.click(screen.getByRole('button', { name: 'FreePlanContent onClose' }));
        expect(onClose).toBeCalledTimes(1);
      });
    });

    describe.each([['CORE'], ['PLUS']])("When the user's org is on the %s plan", (name) => {
      const orgPlan = name as EnginePlan['name'];

      it.each([[true], [false]])('shows <PaidPlanContent> with the correct connected prop (%s)', (connected) => {
        tree({ connected, orgPlan });

        const content = screen.getByTestId('mock-paid-plan-content');

        expect(content.dataset.connected).toBe(connected.toString());
      });

      it('calls the onClose prop if <PaidPlanContent> asks for it', () => {
        const onClose = jest.fn();

        tree({ onClose, orgPlan });
        expect(onClose).not.toBeCalled();
        fireEvent.click(screen.getByRole('button', { name: 'PaidPlanContent onClose' }));
        expect(onClose).toBeCalledTimes(1);
      });

      it('calls the onStartConnection prop if <PaidPlanContent> requests to start the connection', () => {
        const onStartConnection = jest.fn();

        tree({ onStartConnection, orgPlan });
        expect(onStartConnection).not.toBeCalled();
        fireEvent.click(screen.getByRole('button', { name: 'PaidPlanContent onStartConnection' }));
        expect(onStartConnection).toBeCalledTimes(1);
      });
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
