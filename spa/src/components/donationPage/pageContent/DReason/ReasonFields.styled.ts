import styled from 'styled-components';
import { Select as BaseSelect, TextField as BaseTextField } from 'components/base';

export const Root = styled.div`
  display: grid;
  gap: 25px;
`;

export const Select = styled(BaseSelect)`
  && {
    .NreTextFieldInputLabelRoot {
      font-weight: 500;
      margin-bottom: 0.5em;
    }

    .NreTextFieldInputLabelAsterisk {
      color: #ff476c;
    }

    .NreSelectMenu {
      background: ${({ theme }) => theme.colors.cstm_inputBackground};
      border: 1px solid #080708;
      border-color: ${({ theme }) => theme.colors.cstm_inputBorder};
      border-radius: 3px;
      padding: 1rem;

      &:focus {
        border-color: ${({ theme }) => theme.colors.cstm_CTAs};
      }
    }
  }
`;

export const TextField = styled(BaseTextField)`
  && {
    .NreTextFieldInput {
      background: ${({ theme }) => theme.colors.cstm_inputBackground};
      border-color: ${({ theme }) => theme.colors.cstm_inputBorder};
      border-width: 1px;
    }

    .NreTextFieldInputLabelAsterisk {
      color: #ff476c;
    }
  }
`;
