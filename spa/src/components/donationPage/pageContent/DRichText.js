import * as S from './DRichText.styled';

function DRichtText({ element, ...props }) {
  return (
    <S.DRichText {...props}>
      <S.RichTextContent dangerouslySetInnerHTML={{ __html: element.content }} />
    </S.DRichText>
  );
}

export default DRichtText;
