import { Popover as MuiPopover, PopoverProps as MuiPopoverProps } from '@material-ui/core';
import styled from 'styled-components';

export type PopoverProps = MuiPopoverProps;

export const Popover = styled(MuiPopover)`
  .MuiPaper-rounded {
    min-width: 207px;
    box-shadow: none;
    padding: 12px 15px;
    border: 1px solid ${(props) => props.theme.colors.muiGrey[300]};
    background-color: ${(props) => props.theme.colors.muiGrey[100]};
    filter: drop-shadow(0px 2px 20px rgba(0, 0, 0, 0.1));
  }
`;

export default Popover;
