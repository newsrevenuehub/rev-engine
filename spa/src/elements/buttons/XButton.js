import * as S from './XButton.styled';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

function XButton(props) {
  return (
    <S.XButton {...props} data-testid="x-button">
      <S.XIcon icon={faTimes} />
    </S.XButton>
  );
}

export default XButton;
