import { ButtonBase, ClickAwayListener } from '@material-ui/core';
import { Tooltip } from 'components/base';
import useModal from 'hooks/useModal';
import PropTypes from 'prop-types';
import { Icon } from './InfoTooltip.styled';

export const InfoTooltip = (props) => {
  const { buttonLabel, ...other } = props;
  const { handleClose, handleOpen, open } = useModal();

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <span className={props.className}>
        <Tooltip
          disableFocusListener
          disableHoverListener
          disableTouchListener
          onClose={handleClose}
          open={open}
          tooltipWidth={160}
          {...other}
        >
          <ButtonBase aria-label={buttonLabel} disableRipple disableTouchRipple onClick={handleOpen}>
            <Icon />
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
