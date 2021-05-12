import { createPortal } from 'react-dom';
import * as S from './ConnectProcessing.styled';

function ConnectProcessing() {
  return createPortal(
    <S.Underlay>
      <S.ConnectProcessing>Complete connection in other tab. This tab can be closed.</S.ConnectProcessing>
    </S.Underlay>,
    document.getElementById('modal-root')
  );
}

export default ConnectProcessing;
