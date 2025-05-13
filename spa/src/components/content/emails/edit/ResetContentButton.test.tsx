import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import ResetContentButton, { ResetContentButtonProps } from './ResetContentButton';

function tree(props?: Partial<ResetContentButtonProps>) {
  return render(<ResetContentButton defaultContent={() => 'default-content'} editor={null} {...props} />);
}

describe('ResetContentButton', () => {
  it('is disabled if the disabled prop is true', () => {
    tree({ disabled: true });
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled if the editor prop is null', () => {
    tree({ editor: null });
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('sets the editor to default content when clicked', () => {
    const editor = {
      commands: { setContent: jest.fn() }
    } as any;

    tree({ editor });
    expect(editor.commands.setContent).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button'));
    expect(editor.commands.setContent.mock.calls).toEqual([['default-content']]);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
