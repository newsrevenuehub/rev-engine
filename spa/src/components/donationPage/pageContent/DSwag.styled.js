import styled from 'styled-components';
import { motion } from 'framer-motion';

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

export const SwagsSection = styled(motion.div)`
  & > div {
    margin: 1rem 0;
  }
`;

export const SwagsList = styled(motion.ul)`
  margin: 0;
  padding: 0;
`;

export const SwagItem = styled(motion.div)`
  margin: 3rem 0;
`;

export const SwagName = styled.p``;

export const SwagOptions = styled.div``;
