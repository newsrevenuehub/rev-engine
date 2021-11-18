import * as S from './TrashButton.styled';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

function TrashButton(props) {
  return (
    <S.TrashButton {...props} data-testid="delete-button">
      <S.TrashIcon icon={faTrash} />
    </S.TrashButton>
  );
}

export default TrashButton;
