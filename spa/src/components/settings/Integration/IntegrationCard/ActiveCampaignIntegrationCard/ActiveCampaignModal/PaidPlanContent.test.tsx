import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import PaidPlanContent, { PaidPlanContentProps } from './PaidPlanContent';
import { KNOWLEDGE_BASE_URL } from 'constants/helperUrls';

function tree(props?: Partial<PaidPlanContentProps>) {
  return render(<PaidPlanContent onClose={jest.fn()} onStartConnection={jest.fn()} {...props} />);
}

describe('PaidPlanContent', () => {
  it('shows an intro', () => {
    tree();
    expect(screen.getByTestId('intro')).toBeVisible();
  });

  describe("If the revenue program isn't connected to ActiveCampaign", () => {
    it('shows a button that calls the onStartConnection prop', () => {
      const onStartConnection = jest.fn();

      tree({ onStartConnection, connected: false });
      expect(onStartConnection).not.toBeCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Start Connection' }));
      expect(onStartConnection).toBeCalledTimes(1);
    });

    it('shows a button that calls the onClose prop', () => {
      const onClose = jest.fn();

      tree({ onClose });
      expect(onClose).not.toBeCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Maybe Later' }));
      expect(onClose).toBeCalledTimes(1);
    });
  });

  describe('If the revenue program is connected to ActiveCampaign', () => {
    it('shows a link to the knowledge base if the RP is connected', () => {
      tree({ connected: true });
      expect(screen.getByRole('link', { name: 'Go To Knowledge Base' })).toHaveAttribute('href', KNOWLEDGE_BASE_URL);
    });

    it('shows a button that calls the onClose prop', () => {
      const onClose = jest.fn();

      tree({ onClose, connected: true });
      expect(onClose).not.toBeCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(onClose).toBeCalledTimes(1);
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
