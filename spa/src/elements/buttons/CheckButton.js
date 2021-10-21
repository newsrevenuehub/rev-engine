import * as S from './CheckButton.styled';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

function CheckButton(props) {
  return (
    <S.CheckButton {...props} data-testid="add-button">
      <S.CheckIcon icon={faCheck} />
    </S.CheckButton>
  );
}

export default CheckButton;
