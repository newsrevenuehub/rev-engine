import { render, screen } from 'test-utils';

import UnsavedChangesModal from './UnsavedChangesModal';

it('should show button "exit without saving"', () => {
  render(<UnsavedChangesModal isOpen />);
  const exitButton = screen.getByRole('button', { name: 'Yes, exit' });
  expect(exitButton).toBeInTheDocument();
});

it('should show modal close button', () => {
  render(<UnsavedChangesModal isOpen />);
  const closeButton = screen.getByRole('button', { name: 'Cancel' });
  expect(closeButton).toBeInTheDocument();
});
