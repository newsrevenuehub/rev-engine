import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { fireEvent, render, screen, waitFor } from 'test-utils';

import ExportButton from './ExportButton';

jest.mock('hooks/useRequest', () => () => jest.fn());

describe('ExportButton', () => {
  function tree() {
    return render(<ExportButton transactions={1234} email="mock-email" />);
  }

  it('should render publish button', () => {
    tree();

    const button = screen.getByRole('button', { name: /Export/i });
    expect(button).toBeEnabled();
  });

  it('should open export modal when clicked', async () => {
    tree();

    const button = screen.getByRole('button', { name: /Export/i });
    expect(button).toBeEnabled();
    fireEvent.click(button);

    await waitFor(() => {
      const modal = screen.getByRole('presentation');
      expect(modal).toBeVisible();
    });
  });

  it('should be disabled if export is confirmed in modal', async () => {
    tree();
    fireEvent.click(screen.getByRole('button', { name: /Export/i }));

    await waitFor(() => {
      const modal = screen.getByRole('presentation');
      expect(modal).toBeVisible();
    });

    fireEvent.click(screen.getByRole('button', { name: /Export/i }));
    expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sending.../i })).toBeDisabled();
  });

  it('should show tooltip if button disabled and hovered', async () => {
    tree();
    fireEvent.click(screen.getByRole('button', { name: /Export/i }));
    await waitFor(() => {
      const modal = screen.getByRole('presentation');
      expect(modal).toBeVisible();
    });
    fireEvent.click(screen.getByTestId('modal-export-button'));
    expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
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
