import { ButtonBase, ClickAwayListener } from '@material-ui/core';
import { Tooltip } from 'components/base';
import { useState } from 'react';
import * as S from './InfoTooltip.styled';

export const InfoTooltip = (props) => {
  const [open, setOpen] = useState(false);

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <span className={props.className}>
        <Tooltip
          disableFocusListener
          disableHoverListener
          disableTouchListener
          onClose={() => setOpen(false)}
          open={open}
          PopperProps={{
            disablePortal: true
          }}
          tooltipWidth={160}
          {...props}
        >
          <ButtonBase aria-label="Help" disableRipple disableTouchRipple onClick={() => setOpen(true)}>
            <S.Icon />
          </ButtonBase>
        </Tooltip>
      </span>
    </ClickAwayListener>
  );
};

InfoTooltip.propTypes = Tooltip.propTypes;

export default InfoTooltip;
