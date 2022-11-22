import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';

import ExportModal, { ExportModalProps } from './ExportModal';

const onClose = jest.fn();
const onExport = jest.fn();

const defaultProps = {
  email: 'mock-email@mock.com',
  transactions: 1234,
  open: true,
  onClose,
  onExport
};

describe('ExportModal', () => {
  function tree(props?: Partial<ExportModalProps>) {
    return render(<ExportModal {...defaultProps} {...props} />);
  }

  it('should render modal', () => {
    tree();

    const modal = screen.getByRole('dialog', { name: 'Export to Email' });
    expect(modal).toBeVisible();

    const title = screen.getByText(/Export to Email/i);
    expect(title).toBeVisible();

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelButton).toBeEnabled();

    const publishButton = screen.getByRole('button', { name: 'Export' });
    expect(publishButton).toBeEnabled();
  });

  it('should render transaction amount', () => {
    tree();
    expect(screen.getByText(defaultProps.transactions)).toBeVisible();
  });

  it('should render email', () => {
    tree();
    expect(screen.getByText(defaultProps.email)).toBeVisible();
  });

  it('should render message', () => {
    tree();
    expect(screen.getByText(/transactions. When the export is complete, we will email it to/i)).toBeVisible();
  });

  it('should call onClose', () => {
    tree();

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelButton).toBeEnabled();

    fireEvent.click(cancelButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onExport', () => {
    tree();
    const exportButton = screen.getByRole('button', { name: 'Export' });
    expect(exportButton).toBeEnabled();

    fireEvent.click(exportButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
