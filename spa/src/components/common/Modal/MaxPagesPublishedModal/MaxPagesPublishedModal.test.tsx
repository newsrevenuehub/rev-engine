import { PRICING_URL } from 'constants/helperUrls';
import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import MaxPagesPublishedModal, { MaxPagesPublishedModalProps } from './MaxPagesPublishedModal';

function tree(props?: Partial<MaxPagesPublishedModalProps>) {
  return render(<MaxPagesPublishedModal currentPlan="FREE" onClose={jest.fn()} open {...props} />);
}

describe('MaxPagesPublishedModal', () => {
  it('displays nothing when the open prop is false', () => {
    tree({ open: false });
    expect(document.body).toHaveTextContent('');
  });

  describe('When open', () => {
    describe('When the user is on the free plan', () => {
      it("shows a message that they've exceeded their plan limit", () => {
        tree({ currentPlan: 'FREE' });
        expect(screen.getByText('number of live pages for the Free tier', { exact: false })).toBeVisible();
      });

      it('shows a link to the pricing page', () => {
        tree();

        const link = screen.getByRole('link', { name: 'Learn more about Core and Plus' });

        expect(link).toBeVisible();
        expect(link).toHaveAttribute('href', PRICING_URL);
      });
    });

    describe('When the user is on the core plan', () => {
      it("shows a message that they've exceeded their plan limit", () => {
        tree({ currentPlan: 'CORE' });
        expect(screen.getByText('number of live pages for the Core tier', { exact: false })).toBeVisible();
      });

      it('shows a link to the pricing page', () => {
        tree();

        const link = screen.getByRole('link', { name: 'Learn more about Core and Plus' });

        expect(link).toBeVisible();
        expect(link).toHaveAttribute('href', PRICING_URL);
      });
    });

    it('calls the onClose prop when closed', () => {
      const onClose = jest.fn();

      tree({ onClose });
      expect(onClose).not.toBeCalled();

      // There's both a close button in the modal header and a close button in the modal contents.

      const closeButtons = screen.getAllByRole('button', { name: 'Close' });

      expect(closeButtons.length).toBe(2);
      fireEvent.click(closeButtons[0]);
      fireEvent.click(closeButtons[1]);
      expect(onClose).toBeCalledTimes(2);
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
