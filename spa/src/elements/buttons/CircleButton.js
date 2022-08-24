import Spinner from 'elements/Spinner';
import * as S from './CircleButton.styled';

import Tooltip from '@material-ui/core/Tooltip';

function CircleButton({ icon, type, color, onClick, disabled, loading, children, ...props }) {
  const { tootTipText } = props;

  console.log(tootTipText);
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
        <Tooltip title={tootTipText} placement="right">
          {cButton}
        </Tooltip>
      </S.CircleButtonDiv>
    );
  }

  return <>{cButton}</>;
}

export default CircleButton;
