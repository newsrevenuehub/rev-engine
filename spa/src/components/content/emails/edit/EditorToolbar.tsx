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
import { Editor } from '@tiptap/react';
import PropTypes, { InferProps } from 'prop-types';
import EditorButton from './EditorButton';
import FontSizeSelect from './FontSizeSelect';
import { Root, Section } from './EditorToolbar.styled';

const EditorToolbarPropTypes = {
  editor: PropTypes.object
};

export interface EditorToolbarProps extends InferProps<typeof EditorToolbarPropTypes> {
  editor: Editor | null;
}

// Exported for tests only.

export const ALIGNMENT_BUTTONS = [
  { textAlign: 'left', icon: <FormatAlignLeftOutlined />, label: 'Align Left' },
  { textAlign: 'center', icon: <FormatAlignCenterOutlined />, label: 'Align Center' },
  { textAlign: 'right', icon: <FormatAlignRightOutlined />, label: 'Align Right' }
];

export function EditorToolbar({ editor }: EditorToolbarProps) {
  return (
    <Root>
      <Section>
        <EditorButton
          ariaLabel="Bold"
          editor={editor}
          isActive={(editor) => editor.isActive('bold')}
          onClick={(editor) => editor.chain().focus().toggleBold().run()}
        >
          <FormatBoldOutlined />
        </EditorButton>
        <EditorButton
          ariaLabel="Italic"
          editor={editor}
          isActive={(editor) => editor.isActive('italic')}
          onClick={(editor) => editor.chain().focus().toggleItalic().run()}
        >
          <FormatItalicOutlined />
        </EditorButton>
        <EditorButton
          ariaLabel="Underline"
          editor={editor}
          isActive={(editor) => editor.isActive('underline')}
          onClick={(editor) => editor.chain().focus().toggleUnderline().run()}
        >
          <FormatUnderlinedOutlined />
        </EditorButton>
        <EditorButton
          ariaLabel="Strikethrough"
          editor={editor}
          isActive={(editor) => editor.isActive('strike')}
          onClick={(editor) => editor.chain().focus().toggleStrike().run()}
        >
          <FormatStrikethroughOutlined />
        </EditorButton>
      </Section>
      <Section>
        {ALIGNMENT_BUTTONS.map(({ icon, label, textAlign }) => (
          <EditorButton
            key={textAlign}
            ariaLabel={label}
            editor={editor}
            isActive={(editor) => editor.isActive({ textAlign })}
            onClick={(editor) => editor.chain().focus().setTextAlign(textAlign).run()}
          >
            {icon}
          </EditorButton>
        ))}
      </Section>
      <Section>
        <EditorButton
          ariaLabel="Bulleted List"
          editor={editor}
          isActive={(editor) => editor.isActive('bulletList')}
          onClick={(editor) => editor.chain().focus().toggleBulletList().run()}
        >
          <FormatListBulletedOutlined />
        </EditorButton>
        <EditorButton
          ariaLabel="Numbered List"
          editor={editor}
          isActive={(editor) => editor.isActive('orderedList')}
          onClick={(editor) => editor.chain().focus().toggleOrderedList().run()}
        >
          <FormatListNumberedOutlined />
        </EditorButton>
      </Section>
      <Section>
        <FontSizeSelect editor={editor} />
      </Section>
    </Root>
  );
}

EditorToolbar.propTypes = EditorToolbarPropTypes;
export default EditorToolbar;
