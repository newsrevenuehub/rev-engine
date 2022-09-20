import { Tooltip as MuiTooltip, TooltipProps as MuiTooltipProps } from '@material-ui/core';
import styled from 'styled-components';

export type TooltipProps = MuiTooltipProps;

// See https://v4.mui.com/guides/interoperability/#portals

const WrappedTooltip = ({ className, ...other }: MuiTooltipProps) => (
  <MuiTooltip classes={{ tooltip: className }} {...other} />
);

/**
 * @see https://v4.mui.com/components/tooltips/
 */
const Tooltip = styled(WrappedTooltip)`
  && {
    background: rgb(50, 50, 50);
    border-radius: 4px;
    color: white;
    font: 12px Roboto, sans-serif;
    padding: 8px;
  }
`;

export default Tooltip;
