import { EditorToolbarProps } from '../EditorToolbar';

export const EditorToolbar = ({ editor }: EditorToolbarProps) => (
  <div data-testid="mock-editor-toolbar" data-editor={JSON.stringify(editor)} />
);

export default EditorToolbar;
