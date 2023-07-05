import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import UnpublishModal, { UnpublishModalProps } from './UnpublishModal';

const mockPage = { id: 'mock-id', name: 'mock-page-name', revenue_program: { default_donation_page: 'default-id' } };

function tree(props?: Partial<UnpublishModalProps>) {
  return render(<UnpublishModal onClose={jest.fn()} onUnpublish={jest.fn()} open page={mockPage as any} {...props} />);
}

describe('UnpublishModal', () => {
  it('shows nothing if the open prop is false', () => {
    tree({ open: false });
    expect(document.body).toHaveTextContent('');
  });

  it('shows nothing if the page prop is undefined', () => {
    tree({ page: undefined });
    expect(document.body).toHaveTextContent('');
  });

  describe('When open', () => {
    describe('When the page is not the default for the revenue program', () => {
      it('displays a "Unpublish Live Page" header', () => {
        tree();
        expect(screen.getByText('Unpublish Live Page')).toBeVisible();
        expect(screen.queryByText('Unpublish Default Page')).not.toBeInTheDocument();
      });

      it('displays default content', () => {
        tree();
        expect(screen.getByTestId('unpublish-prompt')).toBeVisible();
        expect(screen.queryByTestId('unpublish-default-prompt')).not.toBeInTheDocument();
      });
    });

    describe('When the page is the default for the revenue program', () => {
      it('displays a "Unpublish Default Page" header', () => {
        tree({ page: { ...mockPage, id: 'default-id' } as any });
        expect(screen.getByText('Unpublish Default Page')).toBeVisible();
        expect(screen.queryByText('Unpublish Live Page')).not.toBeInTheDocument();
      });

      it('displays default content', () => {
        tree({ page: { ...mockPage, id: 'default-id' } as any });
        expect(screen.getByTestId('unpublish-default-prompt')).toBeVisible();
        expect(screen.queryByTestId('unpublish-prompt')).not.toBeInTheDocument();
      });
    });

    it('displays a prompt that includes the page name', () => {
      tree({ page: { ...mockPage, name: 'test-page-name' } as any });
      expect(screen.getByTestId('unpublish-prompt')).toHaveTextContent(
        "Are you sure you want to unpublish 'test-page-name'?"
      );
    });

    it('calls the onClose prop when the user closes the modal', () => {
      const onClose = jest.fn();

      tree({ onClose });
      expect(onClose).not.toBeCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(onClose).toBeCalledTimes(1);
    });

    it('calls the onClose prop when the user clicks the Cancel button', () => {
      const onClose = jest.fn();

      tree({ onClose });
      expect(onClose).not.toBeCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onClose).toBeCalledTimes(1);
    });

    it('calls the onUnpublish prop when the user clicks the Unpublish button', () => {
      const onUnpublish = jest.fn();

      tree({ onUnpublish });
      expect(onUnpublish).not.toBeCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Unpublish' }));
      expect(onUnpublish).toBeCalledTimes(1);
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
