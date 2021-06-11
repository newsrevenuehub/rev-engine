import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';

export const getInputBorder = (props) =>
  props.hasErrors ? props.theme.colors.caution : props.theme.colors.inputBorder;

export const baseInputStyles = css`
  height: 45px;
  display: block;
  max-width: 100%;
  padding: 5px 15px;
  background: #fff;
  border: 1px solid #c3c3c3;
  border-radius: 2px;
  font-size: ${(props) => props.theme.fontSizes[1]};
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
  font-size: ${(props) => props.theme.fontSizes[1]};
  font-weight: 500;
  color: ${(props) => props.theme.colors.black};
  margin-bottom: 0.5rem;
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
