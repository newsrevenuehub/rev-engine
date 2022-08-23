import DElement from '../DElement';
import * as S from './RichText.styled';

function RichText({ richTextContent }) {
  return (
    <DElement>
      <S.RichText data-testid="d-rich-text">
        <S.RichTextContent dangerouslySetInnerHTML={{ __html: richTextContent }} />
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
