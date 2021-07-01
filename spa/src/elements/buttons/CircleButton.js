import * as S from './CircleButton.styled';

function CircleButton({ icon, color, ...props }) {
  return (
    <S.CircleButton {...props}>
      <S.Icon icon={icon} type={props.type} color={color} disabled={props.disabled} />
    </S.CircleButton>
  );
}

export default CircleButton;
