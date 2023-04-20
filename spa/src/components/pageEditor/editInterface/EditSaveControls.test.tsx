import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { EditSaveControls, EditSaveControlsProps } from './EditSaveControls';

function tree(props?: Partial<EditSaveControlsProps>) {
  return render(<EditSaveControls onCancel={jest.fn()} onUpdate={jest.fn()} variant="cancel" {...props} />);
}

describe('EditSaveControls', () => {
  it('enables the cancel button if cancelDisabled is falsy', () => {
    tree();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
  });

  it('disables the cancel button if cancelDisabled is true', () => {
    tree({ cancelDisabled: true });
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('enables the update button if updateDisabled is falsy', () => {
    tree();
    expect(screen.getByRole('button', { name: 'Update' })).toBeEnabled();
  });

  it('disables the update button if updateDisabled is true', () => {
    tree({ updateDisabled: true });
    expect(screen.getByRole('button', { name: 'Update' })).toBeDisabled();
  });

  describe('Cancel variant', () => {
    it('shows a Cancel button', () => {
      tree({ variant: 'cancel' });
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('shows an Update button', () => {
      tree({ variant: 'cancel' });
      expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
    });

    it('calls the onCancel prop when the Cancel button is clicked', () => {
      const onCancel = jest.fn();

      tree({ onCancel, variant: 'cancel' });
      expect(onCancel).not.toBeCalled();
      userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onCancel).toBeCalledTimes(1);
    });

    it('calls the onUpdate prop when the Update button is clicked', () => {
      const onUpdate = jest.fn();

      tree({ onUpdate, variant: 'cancel' });
      expect(onUpdate).not.toBeCalled();
      userEvent.click(screen.getByRole('button', { name: 'Update' }));
      expect(onUpdate).toBeCalledTimes(1);
    });

    it('is accessible', async () => {
      const { container } = tree({ variant: 'cancel' });

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('Undo variant', () => {
    it('shows an Undo button', () => {
      tree({ variant: 'undo' });
      expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    });

    it('shows an Update button', () => {
      tree({ variant: 'undo' });
      expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
    });

    it('calls the onCancel prop when the Undo button is clicked', () => {
      const onCancel = jest.fn();

      tree({ onCancel, variant: 'undo' });
      expect(onCancel).not.toBeCalled();
      userEvent.click(screen.getByRole('button', { name: 'Undo' }));
      expect(onCancel).toBeCalledTimes(1);
    });

    it('calls the onUpdate prop when the Update button is clicked', () => {
      const onUpdate = jest.fn();

      tree({ onUpdate, variant: 'undo' });
      expect(onUpdate).not.toBeCalled();
      userEvent.click(screen.getByRole('button', { name: 'Update' }));
      expect(onUpdate).toBeCalledTimes(1);
    });

    it('is accessible', async () => {
      const { container } = tree({ variant: 'undo' });

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
