import { EditorState } from 'draft-js';
import { useState } from 'react';
import { RichTextEditor } from 'components/base';
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';
import { editorStateToHtml, htmlToEditorState } from 'utilities/draftJs';
import { Root } from './RichTextElementEditor.styled';

export function RichTextElementEditor() {
  const { elementContent, setElementContent } = useEditInterfaceContext();
  const [editorState, setEditorState] = useState(() =>
    elementContent ? htmlToEditorState(elementContent) : EditorState.createEmpty()
  );

  function handleEditorStateChange(editorState: EditorState) {
    setEditorState(editorState);
    setElementContent(editorStateToHtml(editorState));
  }

  return (
    <Root>
      <RichTextEditor editorState={editorState} onEditorStateChange={handleEditorStateChange} />
    </Root>
  );
}

(RichTextElementEditor as any).for = 'DRichText';

export default RichTextElementEditor;
