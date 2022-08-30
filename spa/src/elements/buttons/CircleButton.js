import Spinner from 'elements/Spinner';
import * as S from './CircleButton.styled';

import RETooltip from 'elements/RETooltip';

function CircleButton({ icon, type, color, onClick, disabled, loading, children, ...props }) {
  const { tootTipText } = props;

  const cButton = (
    <S.CircleButton {...props} type={type} disabled={disabled} onClick={disabled || loading ? () => {} : onClick}>
      {loading ? (
        <Spinner />
      ) : (
        children || <S.Icon icon={icon} type={props.buttonType} color={color} disabled={disabled || loading} />
      )}
    </S.CircleButton>
  );

  if (tootTipText) {
    return (
      <S.CircleButtonDiv>
        <RETooltip title={tootTipText} placement="right">
          {cButton}
        </RETooltip>
      </S.CircleButtonDiv>
    );
  }

  return <>{cButton}</>;
}

export default CircleButton;
