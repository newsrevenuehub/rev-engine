import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import ConfirmIntervalChangeModal, { ConfirmIntervalChangeModalProps } from './ConfirmIntervalChangeModal';

function tree(props?: Partial<ConfirmIntervalChangeModalProps>) {
  return render(<ConfirmIntervalChangeModal onCancel={jest.fn()} onConfirm={jest.fn()} open {...props} />);
}

describe('ConfirmIntervalChangeModal', () => {
  it('displays nothing if the open prop is false', () => {
    tree({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('displays a dialog if the open prop is true', () => {
    tree({ open: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('calls the onCancel prop if the modal is closed', () => {
    const onCancel = jest.fn();

    tree({ onCancel });
    expect(onCancel).not.toBeCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onCancel).toBeCalledTimes(1);
  });

  it('calls the onCancel prop if the Cancel button is clicked', () => {
    const onCancel = jest.fn();

    tree({ onCancel });
    expect(onCancel).not.toBeCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toBeCalledTimes(1);
  });

  it('calls the onConfirm prop if the confirm button is clicked', () => {
    const onConfirm = jest.fn();

    tree({ onConfirm });
    expect(onConfirm).not.toBeCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm & Save' }));
    expect(onConfirm).toBeCalledTimes(1);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
