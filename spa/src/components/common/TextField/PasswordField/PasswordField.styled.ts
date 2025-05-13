import styled from 'styled-components';
import { TextField } from 'components/base';

export const Root = styled(TextField)`
  /* Move border around the reveal/hide button adornment. */

  && {
    .NreTextFieldInputRoot {
      border: 1.5px solid ${({ theme }) => theme.basePalette.greyscale['30']};
      border-radius: ${({ theme }) => theme.muiBorderRadius.md};
    }

    .NreTextFieldInput {
      border: none;
    }

    .MuiFormLabel-asterisk {
      display: none;
    }
  }
`;
