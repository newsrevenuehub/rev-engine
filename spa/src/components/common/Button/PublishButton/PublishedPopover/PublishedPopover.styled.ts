import { IconButton as MuiIconButton, Popover as MuiPopover } from '@material-ui/core';
import styled from 'styled-components';

export const IconButton = styled(MuiIconButton)`
  && {
    position: absolute;
    top: 8px;
    right: 8px;
  }
` as typeof MuiIconButton;

export const LiveText = styled.p`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: ${(props) => props.theme.colors.muiTeal[600]};
  font-size: ${(props) => props.theme.fontSizesUpdated.lg};
  font-weight: 600;

  svg {
    height: 20px;
    width: 20px;
  }
`;

export const Popover = styled(MuiPopover)`
  .NrePopoverPaper {
    border-radius: ${(props) => props.theme.muiBorderRadius.xl};
    padding: 17px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 400px;

    @media (${(props) => props.theme.breakpoints.phoneOnly}) {
      max-width: calc(100% - 32px);
    }
  }

  p,
  span {
    font-family: ${(props) => props.theme.systemFont};
  }
`;

export const Text = styled.p`
  color: ${(props) => props.theme.colors.muiGrey[600]};
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  font-weight: 500;
  margin: 0;
`;
