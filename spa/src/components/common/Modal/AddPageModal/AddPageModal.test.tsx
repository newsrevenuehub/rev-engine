import { axe } from 'jest-axe';
import { fireEvent, render, screen, waitFor } from 'test-utils';

import userEvent from '@testing-library/user-event';
import AddPageModal, { AddPageModalProps } from './AddPageModal';

const revenuePrograms = [
  { id: '1', name: 'rp-mock-1' },
  { id: '2', name: 'rp-mock-2' },
  { id: '3', name: 'rp-mock-3' }
];

const onClose = jest.fn();
const onAddPage = jest.fn();

describe('AddPageModal', () => {
  function tree(props?: Partial<AddPageModalProps>) {
    return render(
      <AddPageModal open={true} onClose={onClose} onAddPage={onAddPage} revenuePrograms={revenuePrograms} {...props} />
    );
  }

  it('should render modal', () => {
    tree();
    const modal = screen.getByRole('dialog', { name: `New Page` });
    expect(modal).toBeVisible();
  });

  it('should render modal texts', () => {
    tree();
    expect(screen.getByText('New Page')).toBeVisible();
    expect(screen.getByText(/Select the Revenue Program for this new page./i)).toBeVisible();
  });

  it('should render modal actions', () => {
    tree();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Create/i })).toBeEnabled();
  });

  it('should render revenue program dropdown', () => {
    tree();
    const input = screen.getByRole('button', { name: /Revenue Program/i });
    userEvent.click(input);
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByRole('option', { name: 'rp-mock-1' })).toBeVisible();
    expect(screen.getByRole('option', { name: 'rp-mock-2' })).toBeVisible();
    expect(screen.getByRole('option', { name: 'rp-mock-3' })).toBeVisible();
  });

  it('should call onAddPage with selected revenue program', async () => {
    tree();
    expect(onAddPage).not.toBeCalled();
    userEvent.click(screen.getByRole('button', { name: /Revenue Program/i }));
    userEvent.click(screen.getByRole('option', { name: revenuePrograms[0].name }));
    userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => onAddPage.mock.calls.length > 0);
    expect(onAddPage).toHaveBeenCalledWith(revenuePrograms[0].id);
  });

  it('should show error if no revenue program is selected and "Create" is clicked', async () => {
    tree();
    userEvent.click(screen.getByRole('button', { name: /Create/i }));
    await waitFor(() => expect(screen.getByText('Please select a Revenue Program')).toBeVisible());
  });

  it('should show outer error', () => {
    tree({ outerError: 'Outer mock error' });
    expect(screen.getByText('Outer mock error')).toBeVisible();
  });

  it('should not show error message if loading', () => {
    tree({ outerError: 'Outer mock error', loading: true });
    expect(screen.queryByText('Outer mock error')).not.toBeInTheDocument();
  });

  it('should disable create button if loading', () => {
    tree({ loading: true });
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('should call onClose', () => {
    tree();
    const closeButton = screen.getByRole('button', { name: /Cancel/i });
    expect(onClose).not.toHaveBeenCalled();
    expect(closeButton).toBeEnabled();
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();

    userEvent.click(screen.getByRole('button', { name: /Revenue Program/i }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
