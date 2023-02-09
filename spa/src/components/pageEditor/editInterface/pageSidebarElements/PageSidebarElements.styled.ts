import { motion } from 'framer-motion';
import styled from 'styled-components';

export const Root = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
  overflow: hidden;
`;

export const ElementContainer = styled(motion.div)`
  overflow-y: auto;
`;
