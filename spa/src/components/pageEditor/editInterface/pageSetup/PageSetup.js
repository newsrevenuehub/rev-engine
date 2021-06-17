import * as S from './PageSetup.styled';

// Children
import PublishWidget from './PublishWidget';

function PageSetup(props) {
  return (
    <S.PageSetup>
      <S.MainContent>test</S.MainContent>
      <PublishWidget />
    </S.PageSetup>
  );
}

export default PageSetup;
