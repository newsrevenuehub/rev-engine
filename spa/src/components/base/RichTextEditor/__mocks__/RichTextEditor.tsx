interface MockRichTextEditorProps {
  editorState: any;
  onEditorStateChange: (state: any) => void;
}

export function RichTextEditor(props: MockRichTextEditorProps) {
  return (
    <div data-testid="mock-rich-text-editor" data-editor-state={JSON.stringify(props.editorState)}>
      <button onClick={() => props.onEditorStateChange({ mockEditorStateChange: true })}>onEditorStateChange</button>
    </div>
  );
}
