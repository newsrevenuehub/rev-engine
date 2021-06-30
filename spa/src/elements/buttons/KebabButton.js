import * as S from './KebabButton.styled';
import { faEllipsisV } from '@fortawesome/free-solid-svg-icons';

function KebabButton(props) {
  return (
    <S.XButton {...props} data-testid="kebab-button">
      <S.XIcon icon={faEllipsisV} type={props.type} />
    </S.XButton>
  );
}

export default KebabButton;
