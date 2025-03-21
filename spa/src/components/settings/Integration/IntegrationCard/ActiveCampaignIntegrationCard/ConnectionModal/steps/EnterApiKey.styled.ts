import styled from 'styled-components';
import { TextField as BaseTextField } from 'components/base';

export const TextField = styled(BaseTextField)`
  width: 440px;

  .NreTextFieldInputLabelAsterisk {
    display: none;
  }
`;

export const TextFields = styled.div`
  display: grid;
  gap: 25px;
  margin-bottom: 25px;
`;
