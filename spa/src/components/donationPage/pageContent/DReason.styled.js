import { TextField } from 'components/base';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import Input from 'elements/inputs/Input';

// Deps
import MaterialCheckbox from '@material-ui/core/Checkbox';
import MaterialRadio from '@material-ui/core/Radio';

export const ReasonGroup = styled.div`
  margin-bottom: 2rem;
`;

export const ReasonSelect = styled(TextField)`
  && .NreTextFieldInput {
    background: ${({ theme }) => theme.colors.cstm_inputBackground};
    border-color: ${({ theme }) => theme.colors.cstm_inputBorder};
  }
`;

export const SupportOptions = styled.div`
  & > div:first-child {
    margin-bottom: 1rem;
  }
`;

export const ReasonOtherInput = styled(motion(Input))``;

export const BothOptions = styled.div`
  display: flex;
  flex-direction: row;

  & > div:not(:last-child) {
    margin-right: 2rem;
  }

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    flex-direction: column;
    margin: 0;
  }
`;

export const SingleOption = styled.div``;

export const CheckBoxField = styled(motion.div)`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-left: -9px;
`;

export const Checkbox = styled(MaterialCheckbox)``;

export const Radio = styled(MaterialRadio)``;

export const CheckboxLabel = styled.label`
  font-size: ${(props) => props.theme.fontSizes[1]};
`;

export const TributeSelector = styled.div``;

export const TributeHeading = styled.p``;

export const TributeInput = styled(Input)``;

export const inputAnimations = {
  initial: { x: -10, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -10, opacity: 0 }
};
