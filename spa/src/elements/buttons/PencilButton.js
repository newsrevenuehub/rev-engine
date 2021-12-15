import * as S from './PencilButton.styled';
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons';

function PencilButton(props) {
  return (
    <S.PencilButton {...props} data-testid="pencil-button">
      <S.PencilIcon icon={faPencilAlt} />
    </S.PencilButton>
  );
}

export default PencilButton;
