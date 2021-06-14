import { useState } from 'react';
// Deps
import { convertFromHTML, ContentState, EditorState } from 'draft-js';
import { DraftailEditor } from 'draftail';
// import { convertFromHTML, convertToHTML } from 'draft-convert';
import { stateToHTML } from 'draft-js-export-html';
import 'draftail/dist/draftail.css';

// Constants
import * as rtConfig from './config';

// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';

function RichTextEditor() {
  const { elementContent, setElementContent } = useEditInterfaceContext();
  const [editorState, setEditorState] = useState(() => {
    if (elementContent) {
      const blocksFromHTML = convertFromHTML(elementContent);
      const state = ContentState.createFromBlockArray(blocksFromHTML.contentBlocks, blocksFromHTML.entityMap);
      return EditorState.createWithContent(state);
    }
    return EditorState.createEmpty();
  });

  const handleEditorStateChange = (eState) => {
    setEditorState(eState);
    setElementContent(stateToHTML(eState.getCurrentContent()));
  };

  return (
    <DraftailEditor
      data-testid="rich-text-editor"
      editorState={editorState}
      onChange={handleEditorStateChange}
      stripPastedStyles={false}
      enableHorizontalRule={{
        description: 'Horizontal rule'
      }}
      enableLineBreak={{
        description: 'Soft line break',
        icon: rtConfig.BR_ICON
      }}
      maxListNesting={6}
      blockTypes={Object.values(rtConfig.BLOCK_CONTROL)}
      inlineStyles={Object.values(rtConfig.INLINE_CONTROL)}
    />
  );
}

RichTextEditor.for = 'DRichText';

export default RichTextEditor;
