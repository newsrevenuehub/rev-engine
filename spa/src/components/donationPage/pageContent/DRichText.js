import * as S from './DRichText.styled';

function DRichText({ element, ...props }) {
  return (
    <S.DRichText {...props} data-testid="d-rich-text">
      <S.RichTextContent dangerouslySetInnerHTML={{ __html: element.content }} />
    </S.DRichText>
  );
}

DRichText.type = 'DRichText';
DRichText.displayName = 'Rich text';
DRichText.description = 'Add arbitrary rich text to your donation page';
DRichText.required = false;
DRichText.unique = false;

export default DRichText;
