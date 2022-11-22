import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { EditSaveControls, EditSaveControlsProps } from './EditSaveControls';

function tree(props?: Partial<EditSaveControlsProps>) {
  return render(<EditSaveControls onUndo={jest.fn()} onUpdate={jest.fn()} {...props} />);
}

describe('EditSaveControls', () => {
  it('shows an Undo button', () => {
    tree();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
  });

  it('shows an Update button', () => {
    tree();
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
  });

  it('calls the onUndo prop when the Undo button is clicked', () => {
    const onUndo = jest.fn();

    tree({ onUndo });
    expect(onUndo).not.toBeCalled();
    userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toBeCalledTimes(1);
  });

  it('calls the onUpdate prop when the Update button is clicked', () => {
    const onUpdate = jest.fn();

    tree({ onUpdate });
    expect(onUpdate).not.toBeCalled();
    userEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect(onUpdate).toBeCalledTimes(1);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
