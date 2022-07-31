import { render, screen } from 'test-utils';

import UnsavedChangesModal from './UnsavedChangesModal';

describe('Unsaved Changes Modal', () => {
  test('should have enabled buttons for "close" and "exit without saving"', () => {
    render(<UnsavedChangesModal isOpen />);

    const exitButton = screen.getByRole('button', { name: 'Yes, exit' });
    expect(exitButton).toBeEnabled();

    const closeButton = screen.getByRole('button', { name: 'Cancel' });
    expect(closeButton).toBeEnabled();
  });

  test('modal is not rendered when isOpen = false', () => {
    render(<UnsavedChangesModal isOpen={false} />);

    const title = screen.queryByText('Unsaved Changes');
    expect(title).not.toBeInTheDocument();
  });
});
