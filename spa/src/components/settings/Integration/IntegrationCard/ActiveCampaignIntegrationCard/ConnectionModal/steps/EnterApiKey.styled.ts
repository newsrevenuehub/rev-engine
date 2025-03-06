import styled from 'styled-components';
import { ModalFooter as BaseModalFooter, TextField as BaseTextField } from 'components/base';

export const ModalFooter = styled(BaseModalFooter)`
  justify-content: space-between;
`;

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
