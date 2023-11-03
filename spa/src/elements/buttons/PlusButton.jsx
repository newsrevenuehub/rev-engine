import * as S from './PlusButton.styled';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

function PlusButton(props) {
  return (
    <S.PlusButton {...props} data-testid="add-button">
      <S.PlusIcon icon={faPlus} />
    </S.PlusButton>
  );
}

export default PlusButton;
