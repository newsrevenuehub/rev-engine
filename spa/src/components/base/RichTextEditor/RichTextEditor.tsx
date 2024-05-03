import { Editor, EditorProps } from 'react-draft-wysiwyg';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import styled from 'styled-components';

export type RichTextEditorProps = EditorProps;

export const defaultToolbar = {
  options: ['inline', 'blockType', 'fontSize', 'list', 'textAlign', 'link'],
  inline: {
    options: ['bold', 'italic', 'underline', 'strikethrough']
  },
  fontSize: {
    options: [13, 14, 15, 16, 24]
  },
  blockType: {
    inDropdown: false,
    options: ['Normal', 'H2', 'H3', 'H4', 'Blockquote']
  },
  link: {
    defaultTargetOption: '_blank'
  }
};

// We can't apply styles directly to <Editor>. The class names we're
// targeting seem to be set by react-draft-wysiwyg manually.

const Root = styled.div`
  & {
    .rdw-editor-main {
      border: 1px solid ${({ theme }) => theme.colors.grey[0]};
      padding: 0.5rem;
    }
  }
`;

/**
 * A DraftJS-powered rich text editor.
 * @see https://draftjs.org/
 */
export function RichTextEditor(props: RichTextEditorProps) {
  return (
    <Root>
      <Editor
        toolbar={defaultToolbar}
        // Needed to prevent overriding the paste event and losing formatting
        // ref: https://github.com/jpuri/react-draft-wysiwyg/issues/967#issuecomment-792075354
        handlePastedText={() => false}
        {...props}
      />
    </Root>
  );
}

export default RichTextEditor;
