import styled from 'styled-components';
import { motion } from 'framer-motion';

export const ErrorHeading = styled(motion.div)`
  display: flex;
  justify-content: center;
  height: 60px;
  position: relative;

  h2 {
    margin: 0;
    font-size: ${(props) => props.theme.fontSizes[2]};
    color: ${(props) => props.theme.colors.black};
  }
`;

export const ErrorWrapper = styled(motion.div)`
  padding: 2rem;
`;

export const ErrorMessage = styled(motion.div)`
  font-weight: 600;
  padding-bottom: 2rem;
`;

export const ErrorStack = styled(motion.div)`
  padding-bottom: 4rem;
`;
