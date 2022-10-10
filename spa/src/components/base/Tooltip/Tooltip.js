import { Tooltip as MuiTooltip } from '@material-ui/core';
import PropTypes from 'prop-types';
import styled from 'styled-components';

// See https://v4.mui.com/guides/interoperability/#portals

const WrappedTooltip = ({ className, tooltipWidth, ...other }) => (
  <MuiTooltip classes={{ tooltip: className }} {...other} />
);

/**
 * @see https://v4.mui.com/components/tooltips/
 */
export const Tooltip = styled(WrappedTooltip)`
  && {
    background: rgb(50, 50, 50);
    margin-top: 6px;
    border-radius: 4px;
    color: white;
    font: 12px Roboto, sans-serif;
    padding: 8px;
    width: ${({ tooltipWidth }) => `${tooltipWidth}px` ?? 'auto'};
  }
`;

Tooltip.propTypes = {
  /**
   * Width of the tooltip in pixels. If omitted, this lets MUI size it to what
   * it thinks is appropriate.
   */
  tooltipWidth: PropTypes.number,
  className: PropTypes.string
};

export default Tooltip;
