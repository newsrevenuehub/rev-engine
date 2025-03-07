import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import ActiveCampaignModal, { ActiveCampaignModalProps } from './ActiveCampaignModal';
import { ACTIVECAMPAIGN_HOME_URL } from 'constants/helperUrls';

jest.mock('./FreePlanContent');

function tree(props?: Partial<ActiveCampaignModalProps>) {
  return render(<ActiveCampaignModal onClose={jest.fn()} open orgPlan="FREE" {...props} />);
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
      it("shows <FreePlanContent> if the user's organization plan is Free", () => {
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

    // TODO in DEV-5899: handle Core plan
    // TODO in DEV-5898: handle Plus plan

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
