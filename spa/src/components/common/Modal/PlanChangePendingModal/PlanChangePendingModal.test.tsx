import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import PlanChangePendingModal, { PlanChangePendingModalProps } from './PlanChangePendingModal';

function tree(props?: Partial<PlanChangePendingModalProps>) {
  return render(<PlanChangePendingModal futurePlan="CORE" onClose={jest.fn()} open {...props} />);
}

describe('PlanChangePendingModal', () => {
  let openMock: jest.SpyInstance;

  beforeEach(() => {
    openMock = jest.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    openMock.mockRestore();
  });

  it('displays nothing when not open', () => {
    tree({ open: false });
    expect(document.body).toHaveTextContent('');
  });

  describe('When open', () => {
    it('displays a header', () => {
      tree({ open: true });
      expect(screen.getByText('Upgrade Pending')).toBeVisible();
    });

    it('calls onClose when the user closes the modal via the header button', () => {
      const onClose = jest.fn();

      tree({ onClose, open: true });
      expect(onClose).not.toBeCalled();
      fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);
      expect(onClose).toBeCalledTimes(1);
    });

    it('calls onClose when the user closes the modal via the Close button in the footer', () => {
      const onClose = jest.fn();

      tree({ onClose, open: true });
      expect(onClose).not.toBeCalled();
      fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[1]);
      expect(onClose).toBeCalledTimes(1);
    });

    it('is accessible', async () => {
      const { container } = tree({ open: true });

      expect(await axe(container)).toHaveNoViolations();
    });

    describe('When upgrading to Core', () => {
      it('displays an appropriate message for Core', () => {
        tree({ futurePlan: 'CORE', open: true });
        expect(screen.getByText('Your Core features are on the way!')).toBeVisible();
      });

      it('displays a button to view Core features in a new window', () => {
        tree({ futurePlan: 'CORE', open: true });

        const button = screen.getByRole('button', { name: 'View Core Features' });

        expect(button).toBeVisible();
        fireEvent.click(button);
        expect(openMock.mock.calls).toEqual([['https://fundjournalism.org/pricing/', '_blank']]);
      });

      it('calls onClose when the Core features button is clicked', () => {
        const onClose = jest.fn();

        tree({ onClose, futurePlan: 'CORE', open: true });
        expect(onClose).not.toBeCalled();
        fireEvent.click(screen.getByRole('button', { name: 'View Core Features' }));
        expect(onClose).toBeCalledTimes(1);
      });

      it('is accessible', async () => {
        const { container } = tree({ futurePlan: 'CORE', open: true });

        expect(await axe(container)).toHaveNoViolations();
      });
    });

    describe('When upgrading to Plus', () => {
      it('displays an appropriate message', () => {
        tree({ futurePlan: 'PLUS', open: true });
        expect(screen.getByText('Your Plus features are on the way!')).toBeVisible();
      });

      it('is accessible', async () => {
        const { container } = tree({ futurePlan: 'PLUS', open: true });

        expect(await axe(container)).toHaveNoViolations();
      });
    });
  });
});
