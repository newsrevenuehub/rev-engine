import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import EditorToolbar, { ALIGNMENT_BUTTONS, EditorToolbarProps } from './EditorToolbar';

jest.mock('./EditorButton');
jest.mock('./FontSizeSelect');

function tree(props?: Partial<EditorToolbarProps>) {
  return render(<EditorToolbar editor={null} {...props} />);
}

describe('EditorToolbar', () => {
  const editor = { isActive: () => false } as any;

  it('displays a font size select', () => {
    tree({ editor });

    const select = screen.getByTestId('mock-font-size-select');

    expect(select).toBeInTheDocument();
    expect(select.dataset.editor).toBe(JSON.stringify(editor));
  });

  describe.each([
    ['Bold', 'bold', 'toggleBold'],
    ['Italic', 'italic', 'toggleItalic'],
    ['Underline', 'underline', 'toggleUnderline'],
    ['Strikethrough', 'strike', 'toggleStrike'],
    ['Bulleted List', 'bulletList', 'toggleBulletList'],
    ['Numbered List', 'orderedList', 'toggleOrderedList']
  ])('The %s button', (label, property, toggleFunc) => {
    it(`is active if the editor has ${property} active`, () => {
      tree({ editor: { isActive: (prop: string) => prop === property } as any });

      const button = screen.getByTestId(`mock-editor-button-${label}`);

      expect(button).toBeVisible();
      expect(button.dataset.active).toBe('true');
    });

    it(`is inactive if the editor doesn't have ${property} active`, () => {
      tree({ editor: { isActive: () => false } as any });
      expect(screen.getByTestId(`mock-editor-button-${label}`).dataset.active).toBe('false');
    });

    it(`toggles ${property} in the editor when clicked`, () => {
      const editor = {
        [toggleFunc]: jest.fn().mockReturnThis(),
        chain: jest.fn().mockReturnThis(),
        focus: jest.fn().mockReturnThis(),
        isActive: jest.fn(),
        run: jest.fn().mockReturnThis()
      };

      tree({ editor } as any);
      expect(editor[toggleFunc]).not.toHaveBeenCalled();
      fireEvent.click(screen.getByTestId(`mock-editor-button-${label}`));
      expect(editor[toggleFunc]).toHaveBeenCalledTimes(1);
    });
  });

  describe.each(ALIGNMENT_BUTTONS.map((button) => [button.label, button]))('The %s button', (label, { textAlign }) => {
    it(`is active if the editor has ${textAlign} active`, () => {
      tree({ editor: { isActive: (prop: { textAlign: string }) => prop.textAlign === textAlign } as any });
      const button = screen.getByTestId(`mock-editor-button-${label}`);
      expect(button).toBeVisible();
      expect(button.dataset.active).toBe('true');
    });

    it(`is inactive if the editor doesn't have ${textAlign} active`, () => {
      tree({ editor: { isActive: () => false } as any });
      expect(screen.getByTestId(`mock-editor-button-${label}`).dataset.active).toBe('false');
    });

    it(`toggles ${textAlign} in the editor when clicked`, () => {
      const editor = {
        chain: jest.fn().mockReturnThis(),
        focus: jest.fn().mockReturnThis(),
        isActive: jest.fn(),
        run: jest.fn().mockReturnThis(),
        setTextAlign: jest.fn().mockReturnThis()
      };

      tree({ editor } as any);
      expect(editor.setTextAlign).not.toHaveBeenCalled();
      fireEvent.click(screen.getByTestId(`mock-editor-button-${label}`));
      expect(editor.setTextAlign.mock.calls).toEqual([[textAlign]]);
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
