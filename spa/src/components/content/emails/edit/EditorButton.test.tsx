import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import EditorButton, { EditorButtonProps } from './EditorButton';

function tree(props?: Partial<EditorButtonProps>) {
  return render(
    <EditorButton editor={null} onClick={jest.fn()} {...props}>
      children
    </EditorButton>
  );
}

describe('EditorButton', () => {
  it('sets its aria-label attribute if the ariaLabel prop is set', () => {
    tree({ ariaLabel: 'label' });
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'label');
  });

  it('displays children', () => {
    tree();
    expect(screen.getByText('children')).toBeInTheDocument();
  });

  describe('When the editor prop is null', () => {
    it('disables itself', () => {
      tree({ editor: null });
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it("isn't pressed", () => {
      tree({ editor: null });
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('When the editor prop is set', () => {
    const editor = {} as any;

    it('disables itself if the isDisabled prop is undefined', () => {
      tree({ editor });
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('disables itself if the isDisabled prop returns true', () => {
      tree({ editor, isDisabled: () => true });
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('enables itself if the isDisabled prop returns false', () => {
      tree({ editor, isDisabled: () => false });
      expect(screen.getByRole('button')).toBeEnabled();
    });

    it("isn't pressed if the isActive prop is undefined", () => {
      tree({ editor });
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    });

    it('is pressed if the isActive prop returns true', () => {
      tree({ editor, isActive: () => true });
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });

    it('calls the onClick prop with the editor when clicked', () => {
      const onClick = jest.fn();

      tree({ editor, onClick, isDisabled: () => false });
      expect(onClick).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button'));
      expect(onClick.mock.calls).toEqual([[editor]]);
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
