import Spinner from 'elements/Spinner';
import * as S from './CircleButton.styled';

import { Tooltip } from 'components/base';

function CircleButton({ icon, type, color, onClick, disabled, loading, children, tooltipText, ...props }) {
  const cButton = (
    <S.CircleButton {...props} type={type} disabled={disabled} onClick={disabled || loading ? () => {} : onClick}>
      {loading ? (
        <Spinner />
      ) : (
        children || <S.Icon icon={icon} type={props.buttonType} color={color} disabled={disabled || loading} />
      )}
    </S.CircleButton>
  );

  if (tooltipText) {
    return (
      <div>
        <Tooltip title={tooltipText} placement="right">
          {cButton}
        </Tooltip>
      </div>
    );
  }

  return cButton;
}

export default CircleButton;
