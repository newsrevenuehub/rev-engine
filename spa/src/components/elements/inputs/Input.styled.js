import styled from 'styled-components';
import { motion } from 'framer-motion';

export const Wrapper = styled.div`
  margin: 0.5rem;
  width: 100%;
`;

export const Label = styled.label`
  display: block;
  color: ${(props) => props.theme.colors.grey[2]};
`;

const getInputBorder = (props) => (props.hasErrors ? props.theme.colors.caution : props.theme.colors.black);

export const Input = styled.input`
  display: block;
  width: 100%;
  border: none;
  border-bottom: 1px solid ${getInputBorder};
  padding: 0.5rem 0;
  outline: none;

  &:focus {
    border-color: ${(props) => props.theme.colors.primary};
  }
`;

export const Errors = styled(motion.ul)`
  display: block;
  list-style: none;
  padding: 0;
`;

export const Error = styled(motion.li)`
  color: ${(props) => props.theme.colors.caution};
`;

export const errorsAnimation = {
  initial: { opacity: 0, x: -50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 50 }
};
