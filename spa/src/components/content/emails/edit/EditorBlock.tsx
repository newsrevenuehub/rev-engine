import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { Editor, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import PropTypes, { InferProps } from 'prop-types';
import FontSize from 'tiptap-extension-font-size';
import { EditorContent } from './EditorBlock.styled';

const EditorBlockPropTypes = {
  initialValue: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onFocus: PropTypes.func
};

export interface EditorBlockProps extends InferProps<typeof EditorBlockPropTypes> {
  onChange: (value: string) => void;
  onFocus?: ({ editor }: { editor: Editor }) => void;
}

const tipTapExtensions = [
  StarterKit,
  TextAlign.configure({
    types: ['heading', 'paragraph']
  }),
  FontSize,
  TextStyle,
  Underline
];

export function EditorBlock({ initialValue, label, onChange, onFocus }: EditorBlockProps) {
  const editor = useEditor({
    editorProps: {
      attributes: {
        'aria-label': label
      }
    },
    extensions: tipTapExtensions,
    content: initialValue,
    onUpdate: ({ editor }) => onChange(editor.getHTML())
  });

  function handleFocus() {
    if (!editor) {
      // Should never happen.
      throw new Error('editor is undefined');
    }

    if (onFocus) {
      onFocus({ editor });
    }
  }

  return <EditorContent editor={editor} onFocus={handleFocus} />;
}

EditorBlock.propTypes = EditorBlockPropTypes;
export default EditorBlock;
