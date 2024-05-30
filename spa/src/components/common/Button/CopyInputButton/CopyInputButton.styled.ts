import styled from 'styled-components';
import { Button as MuiButton } from '@material-ui/core';
import { TextField } from 'components/base';

export const Wrapper = styled.div`
  display: flex;
  align-items: flex-end;
`;

export const CopyButton = styled(MuiButton)<{ $copied: boolean }>`
  && {
    height: 45px;
    min-width: 95px;
    margin-left: -4px;
    font-weight: 600;
    color: ${(props) => props.theme.colors.white};
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-top-right-radius: ${(props) => props.theme.muiBorderRadius.md};
    border-bottom-right-radius: ${(props) => props.theme.muiBorderRadius.md};
    background-color: ${(props) => (props.$copied ? props.theme.colors.muiTeal[600] : props.theme.colors.muiGrey[600])};

    :hover {
      background-color: ${(props) => props.theme.colors.muiGrey[400]};
    }
  }
`;

export const Input = styled(TextField)`
  flex-grow: 1;

  .NreTextFieldInputRoot {
    margin-top: 0;
  }

  .NreTextFieldInput:focus {
    border-color: #00bfdf;
  }

  .NreCopyInputLabelFormControl {
    margin-bottom: 6px;
  }
`;
