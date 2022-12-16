import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { fireEvent, render, screen, waitFor } from 'test-utils';

import ExportButton from './ExportButton';

jest.mock('hooks/useRequest', () => () => jest.fn());

describe('ExportButton', () => {
  function tree() {
    return render(<ExportButton transactions={1234} email="mock-email" />);
  }

  async function openModal() {
    const button = screen.getByRole('button', { name: /Export/i });

    fireEvent.click(button);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeVisible());
  }

  it('should render an enabled export button', () => {
    tree();

    const button = screen.getByRole('button', { name: /Export/i });
    expect(button).toBeEnabled();
  });

  it('should open export modal when the export button is clicked', async () => {
    tree();
    await openModal();
  });

  it('should disable the export button if export is confirmed in modal', async () => {
    tree();
    await openModal();

    fireEvent.click(screen.getByRole('button', { name: /Export/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sending.../i })).toBeDisabled();
  });

  it('should show tooltip on the export button if it is disabled', async () => {
    tree();
    await openModal();

    fireEvent.click(screen.getByTestId('modal-export-button'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sending.../i })).toBeDisabled();

    const buttonWrapper = screen.getByTestId('export-button-wrapper');
    userEvent.hover(buttonWrapper);

    await waitFor(() => {
      expect(screen.getByText(/Export is being sent/i)).toBeInTheDocument();
    });
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
