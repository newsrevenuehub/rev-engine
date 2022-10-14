import styled from 'styled-components';
import { Button as MuiButton, Popover as MuiPopover } from '@material-ui/core';

export const Flex = styled.div`
  display: flex;
  flex-direction: column;
  align-items: start;
  font-family: ${(props) => props.theme.systemFont};
`;

export const Button = styled(MuiButton)`
  && {
    height: 36px;
    font-weight: 600;
    line-height: 16px;
    color: ${(props) => props.theme.colors.white};
  }
`;

export const Popover = styled(MuiPopover)`
  .MuiPaper-rounded {
    border-radius: ${(props) => props.theme.muiBorderRadius.xl};
    padding: 20px 25px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 400px;

    @media (${(props) => props.theme.breakpoints.phoneOnly}) {
      max-width: calc(100% - 32px);
    }
  }

  p,
  input,
  span {
    font-family: ${(props) => props.theme.systemFont};
  }
`;

export const Text = styled.p`
  margin: 0;
  color: ${(props) => props.theme.colors.muiGrey[600]};
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
`;
