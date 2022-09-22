import { ButtonBase, ClickAwayListener } from '@material-ui/core';
import PropTypes from 'prop-types';
import { Tooltip } from 'components/base';
import { useState } from 'react';
import * as S from './InfoTooltip.styled';

export const InfoTooltip = (props) => {
  const { buttonLabel, ...other } = props;
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
          tooltipWidth={160}
          {...other}
        >
          <ButtonBase aria-label={buttonLabel} disableRipple disableTouchRipple onClick={() => setOpen(true)}>
            <S.Icon />
          </ButtonBase>
        </Tooltip>
      </span>
    </ClickAwayListener>
  );
};

InfoTooltip.propTypes = {
  buttonLabel: PropTypes.string.isRequired,
  ...Tooltip.propTypes
};

export default InfoTooltip;
