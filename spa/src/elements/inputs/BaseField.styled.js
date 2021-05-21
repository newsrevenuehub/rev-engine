import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';

export const getInputBorder = (props) =>
  props.hasErrors ? props.theme.colors.caution : props.theme.colors.inputBorder;

export const baseInputStyles = css`
  display: block;
  width: 100%;
  border: none;
  background: ${(props) => props.theme.colors.inputBackground};
  border: 1px solid;
  border-color: ${(p) => getInputBorder(p)};
  padding: 1rem;
  outline: none;

  transition: all 0.2s;

  font-size: 16px;

  &:focus {
    border-color: ${(props) => props.theme.colors.primary};
  }
`;

export const Wrapper = styled.div`
  margin: 0.5rem;
  width: 100%;
`;

export const FieldWrapper = styled.div`
  display: flex;
  flex-direction: ${(props) => (props.inline ? 'row' : 'column')};
`;

export const Label = styled.label`
  display: block;
  font-weight: 700;
  color: ${(props) => props.theme.colors.grey[2]};
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
