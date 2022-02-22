import * as S from './MainContentBlocker.styled';

function MainContentBlocker({ message }) {
  return <S.MainContentBlocker>{message && <S.BlockMessage>{message}</S.BlockMessage>}</S.MainContentBlocker>;
}

export default MainContentBlocker;
