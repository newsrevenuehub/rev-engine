import { Editor } from '@tiptap/react';
import { Select } from 'components/base';
import PropTypes, { InferProps } from 'prop-types';
import { ChangeEvent, useMemo } from 'react';

const FontSizeSelectPropTypes = {
  editor: PropTypes.object
};

export interface FontSizeSelectProps extends InferProps<typeof FontSizeSelectPropTypes> {
  editor: Editor | null;
}

const FONT_SIZES = [14, 16, 20, 24, 30];

export function FontSizeSelect({ editor }: FontSizeSelectProps) {
  // This cannot be memoized because editor won't change when the selection does.
  const value = editor?.getAttributes('textStyle').fontSize ?? '';

  return (
    <Select
      onChange={(event) => editor?.chain().focus().selectParentNode().setFontSize(event.target.value).run()}
      options={FONT_SIZES.map((size) => ({ label: size, value: `${size}px` }))}
      value={value}
    />
  );
}

FontSizeSelect.propTypes = FontSizeSelectPropTypes;
export default FontSizeSelect;
