import styled from 'styled-components';
import { motion } from 'framer-motion';

export const ErrorHeading = styled(motion.div)`
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  align-items: center;
  height: 40%;
  h2 {
    margin: 0;
    font-size: ${(props) => props.theme.fontSizes[2]};
    color: ${(props) => props.theme.colors.black};
  }
  h4 {
    margin: 0;
    font-size: ${(props) => props.theme.fontSizes[1]};
    color: ${(props) => props.theme.colors.black};
  }
`;

export const ErrorWrapper = styled(motion.div)`
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  align-items: center;
  margin: 0px auto;
  padding: 2rem;
  max-width: 700px;
  height: 50%;
`;
