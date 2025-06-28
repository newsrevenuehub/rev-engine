import { InputAdornment } from '@material-ui/core';
import {
  CircularProgress as BaseCircularProgress,
  ModalContent as BaseModalContent,
  TextField as BaseTextField
} from 'components/base';
import styled from 'styled-components';

export const CircularProgress = styled(BaseCircularProgress)`
  && .NreCircle {
    color: white;
  }
`;

export const FieldAdornment = styled(InputAdornment)`
  && {
    align-self: stretch;
    background-color: ${({ theme }) => theme.basePalette.greyscale[10]};
    color: ${({ theme }) => theme.basePalette.greyscale[50]};
    font-weight: 600;
    height: auto;
    margin-right: 0;
    padding: 10px;
    max-height: none;
  }
`;

export const ModalContent = styled(BaseModalContent)`
  max-width: 670px;
`;

export const Prompt = styled.p`
  margin-top: 0;
`;

export const Explanation = styled.p`
  background-color: ${({ theme }) => theme.basePalette.greyscale[10]};
  border-radius: ${({ theme }) => theme.muiBorderRadius.md};
  color: ${({ theme }) => theme.basePalette.greyscale[70]};
  font-size: ${({ theme }) => theme.fontSizesUpdated.sm};
  padding: 10px;
`;

export const TextField = styled(BaseTextField)`
  && {
    .NreTextFieldInputRoot {
      border: 1px solid ${({ theme }) => theme.basePalette.greyscale[30]};
      border-radius: ${({ theme }) => theme.muiBorderRadius.md};
    }

    .NreTextFieldInput {
      border: none;
    }
  }
`;
