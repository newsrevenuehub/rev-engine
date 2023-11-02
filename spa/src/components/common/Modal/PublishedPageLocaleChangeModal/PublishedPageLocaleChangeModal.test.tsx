import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import PublishedPageLocaleChangeModal, { PublishedPageLocaleChangeModalProps } from './PublishedPageLocaleChangeModal';

function tree(props?: Partial<PublishedPageLocaleChangeModalProps>) {
  return render(<PublishedPageLocaleChangeModal onConfirm={jest.fn()} onClose={jest.fn()} open {...props} />);
}

describe('PublishedPageLocaleChangeModal', () => {
  it('shows nothing if not open', () => {
    tree({ open: false });
    expect(document.body).toHaveTextContent('');
  });

  describe('When open', () => {
    it('shows an explanation', () => {
      tree();
      expect(
        screen.getByText(
          "You're changing the language of a live contribution page. This will change all labels and helper text and could affect contributors' experience. Do you want to change the language?"
        )
      ).toBeVisible();
    });

    it('calls the onClose prop when the Cancel button is clicked', () => {
      const onClose = jest.fn();

      tree({ onClose });
      expect(onClose).not.toBeCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onClose).toBeCalledTimes(1);
    });

    it('calls the onConfirm prop when the Change button is clicked', () => {
      const onConfirm = jest.fn();

      tree({ onConfirm });
      expect(onConfirm).not.toBeCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Change' }));
      expect(onConfirm).toBeCalledTimes(1);
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
