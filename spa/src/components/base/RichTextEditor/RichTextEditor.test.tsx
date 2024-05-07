import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import RichTextEditor, { RichTextEditorProps } from './RichTextEditor';

jest.mock('react-draft-wysiwyg', () => ({
  Editor: ({ toolbar, handlePastedText }: { toolbar: any; handlePastedText: () => boolean }) => (
    <div
      data-testid="mock-react-draft-editor"
      data-toolbar={JSON.stringify(toolbar ?? '')}
      data-handlePastedText={handlePastedText?.()}
    />
  )
}));

describe('RichTextEditor', () => {
  function tree(props?: Partial<RichTextEditorProps>) {
    return render(<RichTextEditor {...props} />);
  }

  it('displays a DraftJS editor', () => {
    tree();
    expect(screen.getByTestId('mock-react-draft-editor')).toBeInTheDocument();
  });

  it('passes props onto the editor', () => {
    const toolbar = { 'mock-toolbar-config': true };

    tree({ toolbar });
    expect(screen.getByTestId('mock-react-draft-editor')!.dataset.toolbar).toEqual(JSON.stringify(toolbar));
  });

  it('should have prop to fix paste formatting issue (handlePastedText)', () => {
    tree();
    expect(screen.getByTestId('mock-react-draft-editor')!.dataset.handlepastedtext).toEqual('false');
  });

  it('is accessible', async () => {
    const { container } = tree();

    // This is vacuously true because we mock the editor--axe flags problems on
    // the real editor, but this is outside our testing scope.

    expect(await axe(container)).toHaveNoViolations();
  });
});
