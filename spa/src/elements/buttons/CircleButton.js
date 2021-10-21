import Spinner from 'elements/Spinner';
import * as S from './CircleButton.styled';

function CircleButton({ icon, type, color, onClick, disabled, loading, ...props }) {
  return (
    <S.CircleButton {...props} type={type} disabled={disabled} onClick={disabled || loading ? () => {} : onClick}>
      {loading ? (
        <Spinner />
      ) : (
        <S.Icon icon={icon} type={props.buttonType} color={color} disabled={disabled || loading} />
      )}
    </S.CircleButton>
  );
}

export default CircleButton;
