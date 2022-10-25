import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { Modal, ModalProps } from './Modal';

describe('Modal', () => {
  function tree(props?: Partial<ModalProps>) {
    return render(
      <Modal aria-labelledby="mock-content" open {...props}>
        <div id="mock-content">children</div>
        <button>action</button>
      </Modal>
    );
  }

  describe('When open', () => {
    it('displays a modal when open', () => {
      tree({ open: true });
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('displays its children when open', () => {
      tree({ open: true });
      expect(screen.getByText('children')).toBeInTheDocument();
    });

    it('focuses the first input inside it', () => {
      tree({ open: true });
      expect(screen.getByRole('button', { name: 'action' })).toHaveFocus();
    });

    it('is accessible', async () => {
      tree({ open: true });

      // We need to point AXE directly at the dialog.
      expect(await axe(screen.getByRole('dialog'))).toHaveNoViolations();
    });
  });

  describe('When closed', () => {
    it("doesn't display its children when closed", () => {
      tree({ open: false });
      expect(screen.queryByText('children')).not.toBeInTheDocument();
    });

    it('is accessible', async () => {
      const { container } = tree({ open: false });

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
