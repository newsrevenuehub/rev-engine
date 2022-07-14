import styled from 'styled-components';
import { motion } from 'framer-motion';

export const Styles = styled(motion.div)``;

export const StylesList = styled(motion.ul)`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  padding: 1rem;
  margin: 0;
`;

export const StylesSearch = styled(motion.div)`
  padding: 10px 40px;
  width: 100%;
  margin-bottom: 20px;

  input {
    width: 90%;
    max-width: 420px;
    margin: auto;
    display: block;
    padding: 8px 20px;
  }
`;
