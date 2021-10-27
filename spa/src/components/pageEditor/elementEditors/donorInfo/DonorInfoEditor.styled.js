import styled from 'styled-components';
import Switch from '@material-ui/core/Switch';
import MaterialCheckbox from '@material-ui/core/Checkbox';
import { motion } from 'framer-motion';

export const DonorInfoEditor = styled.div`
  margin: 3rem 0 3rem 6rem;
`;

export const OptionsList = styled.ul`
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
`;

export const OptionGroup = styled.li``;

export const ToggleWrapper = styled.div``;

export const Toggle = styled(Switch)``;

export const OptionLabel = styled.label``;

export const CheckboxWrapper = styled(motion.div)`
  margin-left: 2rem;
`;

export const checkboxAnimation = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -10 }
};

export const CheckBoxField = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  align-self: flex-end;
`;

export const Checkbox = styled(MaterialCheckbox)``;

export const CheckboxLabel = styled.label`
  font-size: 12px;
  font-style: italic;
`;
