import RichTextDisplay from 'components/base/RichTextDisplay/RichTextDisplay';
import PropTypes, { InferProps } from 'prop-types';
import DElement from './DElement';

const DRichTextPropTypes = {
  element: PropTypes.shape({
    content: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    uuid: PropTypes.string.isRequired
  })
};

export interface DRichTextProps extends InferProps<typeof DRichTextPropTypes> {
  element: {
    content: string;
    type: 'DRichText';
    uuid: string;
  };
}

export function DRichText({ element }: DRichTextProps) {
  return (
    <DElement>
      <RichTextDisplay html={element.content} />
    </DElement>
  );
}

DRichText.propTypes = DRichTextPropTypes;
DRichText.type = 'DRichText';
DRichText.displayName = 'Rich Text';
DRichText.description = 'Add arbitrary rich text to your contribution page';
DRichText.required = false;
DRichText.unique = false;

export default DRichText;
