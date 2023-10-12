import { Tooltip as MuiTooltip, TooltipProps as MuiTooltipProps } from '@material-ui/core';
import styled from 'styled-components';

export interface TooltipProps extends MuiTooltipProps {
  /**
   * Width of the tooltip in pixels. If omitted, this lets MUI size it to what
   * it thinks is appropriate.
   */
  tooltipWidth?: number;
}

// See https://v4.mui.com/guides/interoperability/#portals

const WrappedTooltip = ({ className, tooltipWidth, ...other }: TooltipProps) => (
  <MuiTooltip classes={{ tooltip: className }} PopperProps={{ modifiers: { offset: { offset: '0,6' } } }} {...other} />
);

/**
 * @see https://v4.mui.com/components/tooltips/
 */
export const Tooltip = styled(WrappedTooltip)`
  && {
    background: rgb(50, 50, 50);
    border-radius: 4px;
    color: white;
    font:
      12px Roboto,
      sans-serif;
    margin: 0;
    padding: 8px;
    width: ${({ tooltipWidth }) => (tooltipWidth ? `${tooltipWidth}px` : 'auto')};
  }
`;

export default Tooltip;
