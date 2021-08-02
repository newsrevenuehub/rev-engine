import * as S from './DRichText.styled';
import DElement from './DElement';

function DRichText({ element, ...props }) {
  return (
    <DElement {...props} data-testid="d-rich-text">
      <S.RichTextContent dangerouslySetInnerHTML={{ __html: element.content }} />
    </DElement>
  );
}

DRichText.type = 'DRichText';
DRichText.displayName = 'Rich text';
DRichText.description = 'Add arbitrary rich text to your donation page';
DRichText.required = false;
DRichText.unique = false;

export default DRichText;
