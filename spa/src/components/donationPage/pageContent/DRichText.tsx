import RichTextDisplay from 'components/base/RichTextEditor/RichTextDisplay';
import PropTypes, { InferProps } from 'prop-types';
import DElement from './DElement';
import i18n from 'i18n';

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
DRichText.displayName = i18n.t('donationPage.dRichText.richText');
DRichText.description = i18n.t('donationPage.dRichText.addRichTextToPage');
DRichText.required = false;
DRichText.unique = false;

export default DRichText;
