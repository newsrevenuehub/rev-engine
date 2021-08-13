import { useState } from 'react';
import * as S from './RichTextEditor.styled';

// Draft.js etc
import { Editor } from 'react-draft-wysiwyg';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import { convertToRaw, ContentState, EditorState } from 'draft-js';
import draftToHtml from 'draftjs-to-html';
import htmlToDraft from 'html-to-draftjs';
import richtextConfig from './config';

// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';

function RichTextEditor() {
  const { elementContent, setElementContent } = useEditInterfaceContext();
  const [editorState, setEditorState] = useState(() => {
    if (elementContent) {
      const blocksFromHTML = htmlToDraft(elementContent);
      const state = ContentState.createFromBlockArray(blocksFromHTML.contentBlocks, blocksFromHTML.entityMap);
      return EditorState.createWithContent(state);
    }
    return EditorState.createEmpty();
  });

  const handleEditorStateChange = (eState) => {
    console.log('eState', eState.getCurrentContent());
    console.log('html eState', draftToHtml(convertToRaw(eState.getCurrentContent())));
    setEditorState(eState);
    setElementContent(draftToHtml(convertToRaw(eState.getCurrentContent())));
  };

  return (
    <S.RichTextEditorWrapper>
      <Editor editorState={editorState} onEditorStateChange={handleEditorStateChange} toolbar={richtextConfig} />
    </S.RichTextEditorWrapper>
  );
}

RichTextEditor.for = 'DRichText';

export default RichTextEditor;
