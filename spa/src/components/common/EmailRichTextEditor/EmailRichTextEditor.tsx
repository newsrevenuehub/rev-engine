import {
  FormatAlignCenterOutlined,
  FormatAlignLeftOutlined,
  FormatAlignRightOutlined,
  FormatBoldOutlined,
  FormatItalicOutlined,
  FormatListBulletedOutlined,
  FormatListNumberedOutlined,
  FormatStrikethroughOutlined,
  FormatUnderlinedOutlined
} from '@material-ui/icons';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import PropTypes, { InferProps } from 'prop-types';
import FontSize from 'tiptap-extension-font-size';
import EditorButton from './EditorButton';
import FontSizeSelect from './FontSizeSelect';

const tipTapExtensions = [
  StarterKit,
  TextAlign.configure({
    types: ['heading', 'paragraph']
  }),
  FontSize,
  TextStyle,
  Underline
];

const ALIGNMENT_BUTTONS = [
  { textAlign: 'left', icon: <FormatAlignLeftOutlined aria-label="Align Left" /> },
  { textAlign: 'center', icon: <FormatAlignCenterOutlined aria-label="Align Center" /> },
  { textAlign: 'right', icon: <FormatAlignRightOutlined aria-label="Align Right" /> }
];

const EmailRichTextEditorPropTypes = {
  onChange: PropTypes.func.isRequired,
  initialValue: PropTypes.string.isRequired
};

export interface EmailRichTextEditorProps extends InferProps<typeof EmailRichTextEditorPropTypes> {
  onChange: (value: string) => void;
}

export function EmailRichTextEditor({ initialValue, onChange }: EmailRichTextEditorProps) {
  const editor = useEditor({
    extensions: tipTapExtensions,
    content: initialValue,
    onUpdate: ({ editor }) => onChange(editor.getHTML())
  });

  return (
    <>
      <EditorButton
        editor={editor}
        isActive={(editor) => editor.isActive('bold')}
        onClick={(editor) => editor.chain().focus().toggleBold().run()}
      >
        <FormatBoldOutlined aria-label="Bold" />
      </EditorButton>
      <EditorButton
        editor={editor}
        isActive={(editor) => editor.isActive('italic')}
        onClick={(editor) => editor.chain().focus().toggleItalic().run()}
      >
        <FormatItalicOutlined aria-label="Italic" />
      </EditorButton>
      <EditorButton
        editor={editor}
        isActive={(editor) => editor.isActive('underline')}
        onClick={(editor) => editor.chain().focus().toggleUnderline().run()}
      >
        <FormatUnderlinedOutlined aria-label="Underline" />
      </EditorButton>
      <EditorButton
        editor={editor}
        isActive={(editor) => editor.isActive('strike')}
        onClick={(editor) => editor.chain().focus().toggleStrike().run()}
      >
        <FormatStrikethroughOutlined aria-label="Strikethrough" />
      </EditorButton>
      <EditorButton
        editor={editor}
        isActive={(editor) => editor.isActive('bulletList')}
        onClick={(editor) => editor.chain().focus().toggleBulletList().run()}
      >
        <FormatListBulletedOutlined aria-label="Bulleted List" />
      </EditorButton>
      <EditorButton
        editor={editor}
        isActive={(editor) => editor.isActive('orderedList')}
        onClick={(editor) => editor.chain().focus().toggleOrderedList().run()}
      >
        <FormatListNumberedOutlined aria-label="Numbered List" />
      </EditorButton>
      {ALIGNMENT_BUTTONS.map(({ icon, textAlign }) => (
        <EditorButton
          key={textAlign}
          editor={editor}
          isActive={(editor) => editor.isActive({ textAlign })}
          onClick={(editor) => editor.chain().focus().setTextAlign(textAlign).run()}
        >
          {icon}
        </EditorButton>
      ))}
      <FontSizeSelect editor={editor} />
      <EditorContent editor={editor} />
    </>
  );
}

EmailRichTextEditor.propTypes = EmailRichTextEditorPropTypes;
export default EmailRichTextEditor;
