import styled from 'styled-components';
import { motion } from 'framer-motion';
import MaterialCheckbox from '@material-ui/core/Checkbox';

export const DSwag = styled(motion.div)``;

export const swagAnimation = {
  initial: { y: -10, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -10, opacity: 0 }
};

export const ThresholdMessage = styled.p``;

export const OptOut = styled.div`
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
