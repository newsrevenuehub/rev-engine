import Spinner from 'elements/Spinner';
import * as S from './CircleButton.styled';

function CircleButton({ icon, color, onClick, disabled, loading, ...props }) {
  return (
    <S.CircleButton {...props} onClick={disabled || loading ? () => {} : onClick}>
      {loading ? <Spinner /> : <S.Icon icon={icon} type={props.type} color={color} disabled={disabled || loading} />}
    </S.CircleButton>
  );
}

export default CircleButton;
