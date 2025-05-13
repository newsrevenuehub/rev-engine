import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import FontSizeSelect, { DEFAULT_FONT_SIZE, FONT_SIZES, FontSizeSelectProps } from './FontSizeSelect';

function tree(props?: Partial<FontSizeSelectProps>) {
  return render(<FontSizeSelect editor={null} {...props} />);
}

describe('FontSizeSelect', () => {
  const editor = {
    getAttributes: () => ({ fontSize: '24px' })
  } as any;

  it('displays an option for every font size allowed', () => {
    tree({ editor });
    userEvent.click(screen.getByRole('button'));
    expect(screen.getAllByRole('option')).toHaveLength(FONT_SIZES.length);

    for (const size of FONT_SIZES) {
      expect(screen.getByRole('option', { name: size.toString() })).toBeVisible();
    }
  });

  it('is enabled if the editor is set', () => {
    tree({ editor });
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-disabled');
  });

  it('selects the font size for the editor', () => {
    tree({
      editor: {
        getAttributes: () => ({ fontSize: '30px' })
      } as any
    });
    expect(screen.getByRole('button')).toHaveTextContent('30');
  });

  it('selects the default font size and disables itself if the editor is unset', () => {
    tree();

    const menu = screen.getByRole('button');

    expect(menu).toHaveAttribute('aria-disabled', 'true');
    expect(menu).toHaveTextContent(DEFAULT_FONT_SIZE.toString());
  });

  it('selects the default font size if the editor has none set', () => {
    tree({
      editor: {
        getAttributes: () => ({})
      } as any
    });
    expect(screen.getByRole('button')).toHaveTextContent(DEFAULT_FONT_SIZE.toString());
  });

  it('sets the font size of the entire block when an option is chosen', () => {
    const editor = {
      chain: jest.fn().mockReturnThis(),
      focus: jest.fn().mockReturnThis(),
      getAttributes: () => ({}),
      run: jest.fn().mockReturnThis(),
      selectParentNode: jest.fn().mockReturnThis(),
      setFontSize: jest.fn().mockReturnThis()
    } as any;

    tree({ editor });
    userEvent.click(screen.getByRole('button'));
    userEvent.click(screen.getByRole('option', { name: '24' }));
    expect(editor.setFontSize.mock.calls).toEqual([['24px']]);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
