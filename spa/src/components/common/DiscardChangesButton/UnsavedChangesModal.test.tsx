import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import { UnsavedChangesModal, UnsavedChangesModalProps } from './UnsavedChangesModal';

function tree(props?: Partial<UnsavedChangesModalProps>) {
  return render(<UnsavedChangesModal onCancel={jest.fn()} onExit={jest.fn()} {...props} />);
}

describe('UnsavedChangesModal', () => {
  it('displays nothing when not open', () => {
    tree();
    expect(document.body.textContent).toBe('');
  });

  describe('When open', () => {
    it('displays a prompt message', () => {
      tree({ open: true });
      expect(screen.getByText('Are you sure you want to exit without saving your changes?')).toBeVisible();
    });

    it('displays an enabled cancel button that calls onCancel when clicked', () => {
      const onCancel = jest.fn();

      tree({ onCancel, open: true });

      const button = screen.getByRole('button', { name: 'Cancel' });

      expect(button).toBeEnabled();
      expect(onCancel).not.toBeCalled();
      fireEvent.click(button);
      expect(onCancel).toBeCalledTimes(1);
    });

    it('displays an enabled exit button that calls onExit when clicked', () => {
      const onExit = jest.fn();

      tree({ onExit, open: true });

      const button = screen.getByRole('button', { name: 'Yes, exit' });

      expect(button).toBeEnabled();
      expect(onExit).not.toBeCalled();
      fireEvent.click(button);
      expect(onExit).toBeCalledTimes(1);
    });

    it('is accessible', async () => {
      const { container } = tree({ open: true });

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
