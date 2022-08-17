import DElement from '../DElement';
import * as S from './RichText.styled';

function RichText({ element, ...props }) {
  return (
    <DElement>
      <S.RichText {...props} data-testid="d-rich-text">
        <S.RichTextContent dangerouslySetInnerHTML={{ __html: element.content }} />
      </S.RichText>
    </DElement>
  );
}

RichText.type = 'DRichText';
RichText.displayName = 'Rich text';
RichText.description = 'Add arbitrary rich text to your donation page';
RichText.required = false;
RichText.unique = false;

export default RichText;
