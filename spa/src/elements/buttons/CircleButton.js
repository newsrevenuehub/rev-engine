import * as S from './CircleButton.styled';

function CircleButton({ icon, color, ...props }) {
  return (
    <S.CircleButton {...props}>
      <S.Icon icon={icon} type={props.type} disabled={props.disabled} />
    </S.CircleButton>
  );
}

export default CircleButton;
