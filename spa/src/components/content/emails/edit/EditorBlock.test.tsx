import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import EditorBlock, { EditorBlockProps } from './EditorBlock';

function tree(props?: Partial<EditorBlockProps>) {
  return render(<EditorBlock initialValue="initial-value" label="test-label" onChange={jest.fn()} {...props} />);
}

describe('EditorBlock', () => {
  it('displays a rich text editor with the label prop and initialValue prop', () => {
    tree();
    expect(screen.getByLabelText('test-label')).toHaveTextContent('initial-value');
  });

  // Skipping tests around onChange and onSelectionUpdate because it appears
  // jsdom doesn't support contenteditable (which taptap uses) well.

  it('calls the onFocus prop when the editor is focused', () => {
    const onFocus = jest.fn();

    tree({ onFocus });
    expect(onFocus).not.toHaveBeenCalled();
    fireEvent.focus(screen.getByLabelText('test-label'));
    expect(onFocus).toBeCalledTimes(1);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
