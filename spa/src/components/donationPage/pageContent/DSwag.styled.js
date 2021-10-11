import styled from 'styled-components';
import { motion } from 'framer-motion';
import MaterialCheckbox from '@material-ui/core/Checkbox';

export const DSwag = styled(motion.div)``;

export const containerSwagimation = {
  initial: { y: -10, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -10, opacity: 0 },
  transition: {
    staggerChildren: 0.5
  }
};

export const optSwagimation = {
  initial: { x: -10, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -10, opacity: 0 }
};

export const ThresholdMessage = styled.p`
  font-style: italic;
`;

export const OptOut = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  align-self: flex-end;
`;

export const SwagsList = styled(motion.ul)`
  margin: 0;
  padding: 0;
`;

export const Checkbox = styled(MaterialCheckbox)``;

export const CheckboxLabel = styled.label`
  font-size: 12px;
  font-style: italic;
`;

export const SwagItem = styled(motion.div)`
  margin: 3rem 1rem;
`;

export const SwagName = styled.p``;

export const SwagOptions = styled.div`
  max-width: 300px;
`;
