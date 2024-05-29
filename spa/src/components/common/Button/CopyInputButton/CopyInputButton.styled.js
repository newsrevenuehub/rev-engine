import styled from 'styled-components';
import { Button as MuiButton } from '@material-ui/core';

export const Title = styled.p`
  margin: 0 0 6px 0;
  font-weight: 600;
  color: ${(props) => props.theme.colors.muiGrey[900]};
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
`;

export const CopyButton = styled(MuiButton)`
  && {
    min-width: 95px;
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
  width: 100%;
  border-top-left-radius: ${(props) => props.theme.muiBorderRadius.md};
  border-bottom-left-radius: ${(props) => props.theme.muiBorderRadius.md};
  border: 1px solid ${(props) => props.theme.colors.muiGrey[400]};

  &:focus {
    outline-color: #00bfdf;
  }
`;
