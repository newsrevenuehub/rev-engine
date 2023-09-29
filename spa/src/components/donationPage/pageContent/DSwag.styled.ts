import styled from 'styled-components';
import { TextField as BaseTextField } from 'components/base';

export const Controls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const TextField = styled(BaseTextField)`
  .NreTextFieldInputLabelAsterisk {
    color: #ff476c;
  }

  .NreTextFieldSelectSelect {
    background-color: ${({ theme }) => theme.basePalette.greyscale.white};
  }
`;

export const ThresholdDescription = styled.p`
  font-family: Roboto, sans-serif;
  font-size: 16px;
`;
