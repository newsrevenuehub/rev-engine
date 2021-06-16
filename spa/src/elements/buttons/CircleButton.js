import * as S from './CircleButton.styled';

function CircleButton({ icon, color, ...props }) {
  return (
    <S.CircleButton {...props}>
      <S.Icon icon={icon} color={color} />
    </S.CircleButton>
  );
}

export default CircleButton;
