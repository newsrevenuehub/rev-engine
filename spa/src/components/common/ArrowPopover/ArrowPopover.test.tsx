import { axe } from 'jest-axe';
import { fireEvent, render, screen, waitFor } from 'test-utils';
import ArrowPopover, { ArrowPopoverProps } from './ArrowPopover';

function tree(props?: Partial<ArrowPopoverProps>) {
  return render(
    <ArrowPopover anchorEl={document.body} onClose={jest.fn()} open {...props}>
      children
    </ArrowPopover>
  );
}

describe('ArrowPopover', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  describe('When open', () => {
    it('displays its children', () => {
      tree();
      expect(screen.getByText('children')).toBeVisible();
    });

    it('calls onClose when the close button is clicked', () => {
      const onClose = jest.fn();

      tree({ onClose });
      expect(onClose).not.toBeCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(onClose).toBeCalledTimes(1);
    });

    it('calls onClose when the user clicks outside the content', () => {
      // Fake timers are needed to test <ClickAwayListener>.
      // See https://github.com/mui/material-ui/issues/24783

      const onClose = jest.fn();

      tree({ onClose });
      expect(onClose).not.toBeCalled();
      jest.advanceTimersToNextTimer();
      fireEvent.click(document.body);
      expect(onClose).toBeCalledTimes(1);
    });

    it('is accessible', async () => {
      const { container } = tree();

      jest.useRealTimers();
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('When closed', () => {
    it('displays its children', () => {
      tree({ open: false });
      expect(screen.queryByText('children')).not.toBeInTheDocument();
    });

    it('is accessible', async () => {
      const { container } = tree({ open: false });

      jest.useRealTimers();
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
