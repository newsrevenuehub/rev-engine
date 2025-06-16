import { Editor } from '@tiptap/react';
import { MenuItemProps, Select } from 'components/base';
import PropTypes, { InferProps } from 'prop-types';

const FontSizeSelectPropTypes = {
  editor: PropTypes.object
};

export interface FontSizeSelectProps extends InferProps<typeof FontSizeSelectPropTypes> {
  editor: Editor | null;
}

// These are exported for testing only.

export const FONT_SIZES = [14, 16, 20, 24, 30];
export const DEFAULT_FONT_SIZE = 16;

export function FontSizeSelect({ editor }: FontSizeSelectProps) {
  // This cannot be memoized because editor won't change when the selection does.
  const value = editor?.getAttributes('textStyle').fontSize ?? `${DEFAULT_FONT_SIZE}px`;

  return (
    <Select
      MenuItemProps={
        {
          component: (props: MenuItemProps) => <li data-edit-email-route-maintain-editor-focus {...props} />
        } as any
      }
      disabled={!editor}
      onChange={(event) => editor?.chain().focus().selectParentNode().setFontSize(event.target.value).run()}
      options={FONT_SIZES.map((size) => ({
        label: size,
        value: `${size}px`
      }))}
      value={value}
    />
  );
}

FontSizeSelect.propTypes = FontSizeSelectPropTypes;
export default FontSizeSelect;
