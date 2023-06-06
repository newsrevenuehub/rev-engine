import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import UnpublishModal, { UnpublishModalProps } from './UnpublishModal';

function tree(props?: Partial<UnpublishModalProps>) {
  return render(
    <UnpublishModal
      onClose={jest.fn()}
      onUnpublish={jest.fn()}
      open
      page={{ name: 'mock-page-name' } as any}
      {...props}
    />
  );
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
    it('displays a prompt that includes the page name', () => {
      tree({ page: { name: 'test-page-name' } as any });
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
