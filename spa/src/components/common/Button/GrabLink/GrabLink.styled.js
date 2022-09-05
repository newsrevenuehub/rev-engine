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
    font-weight: 600;
    line-height: 16px;
    color: ${(props) => props.theme.colors.white};
  }
`;

export const Popover = styled(MuiPopover)`
  .MuiPaper-rounded {
    border-radius: ${(props) => props.theme.muiBorderRadius.xl};
    padding: 20px 25px;
    display: grid;
    gap: 20px;
    grid-direction: row;
    max-width: 400px;
  }
`;

export const Title = styled.p`
  margin: 0 0 6px 0;
  font-weight: 600;
  color: ${(props) => props.theme.colors.muiGrey[900]};
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
`;

export const CopyButton = styled(MuiButton)`
  && {
    width: 95px;
    margin-left: -4px;
    font-weight: 600;
    color: ${(props) => props.theme.colors.white};
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-top-right-radius: ${(props) => props.theme.muiBorderRadius.md};
    border-bottom-right-radius: ${(props) => props.theme.muiBorderRadius.md};
    background-color: ${(props) => (props.copied ? props.theme.colors.muiTeal[600] : props.theme.colors.muiGrey[600])};

    :hover {
      background-color: ${(props) => props.theme.colors.muiGrey[400]};
    }
  }
`;

export const Input = styled.input`
  padding: 12px 0 12px 12px;
  flex-grow: 1;
  border-top-left-radius: ${(props) => props.theme.muiBorderRadius.md};
  border-bottom-left-radius: ${(props) => props.theme.muiBorderRadius.md};
  border: 1px solid ${(props) => props.theme.colors.muiGrey[400]};
`;

export const Text = styled.p`
  margin: 0;
  color: ${(props) => props.theme.colors.muiGrey[600]};
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
`;
