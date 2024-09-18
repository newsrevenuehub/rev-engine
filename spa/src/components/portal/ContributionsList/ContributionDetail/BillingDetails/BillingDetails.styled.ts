import { TextField } from 'components/base';
import styled from 'styled-components';

export const CheckboxLabel = styled.span`
  color: ${({ theme }) => theme.basePalette.greyscale.black};
  font-size: ${({ theme }) => theme.fontSizesUpdated.sm};
`;

export const StyledTextField = styled(TextField)`
  && {
    .NreTextFieldInput {
      padding-left: 20px;
    }
  }
`;

export const StartInputAdornment = styled.div`
  position: absolute;
  left: 12px;
`;
