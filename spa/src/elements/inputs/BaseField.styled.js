import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';

export const getInputBorder = (props) => {
  const { highlighted, readOnly, theme, hasErrors } = props;
  if (hasErrors) return theme.colors.caution;
  if (highlighted) return theme.colors.caution;
  if (readOnly) return theme.colors.grey[3];
  return props.theme.colors.cstm_inputBorder || props.theme.colors.inputBorder;
};

export const baseInputStyles = css`
  height: 45px;
  display: block;
  max-width: 100%;
  padding: 5px 15px;
  outline: ${(props) => (props.readOnly ? 'none' : 'auto')};
  color: ${(props) => (props.readOnly ? props.theme.colors.grey[3] : props.theme.colors.black)};
  background: ${(props) => props.theme.colors.cstm_inputBackground || props.theme.colors.inputBackground};
  border: 1px solid;
  border-color: ${(props) => getInputBorder(props)};
  border-radius: ${(props) => props.theme.radii[0]};
  font-size: ${(props) => props.theme.fontSizes[1]};
`;

export const Wrapper = styled.div`
  width: 100%;
`;

export const FieldWrapper = styled.div`
  display: flex;
  flex-direction: ${(props) => (props.inline ? 'row' : 'column')};
`;

export const Label = styled.label`
  display: block;
  font-family: ${(props) => props.theme.systemFont};
  font-size: ${(props) => props.theme.fontSizes[1]};
  font-weight: 500;
  color: ${(props) => props.theme.colors.black};
  margin-bottom: 0.5rem;
`;

export const HelpText = styled.p`
  margin-top: 1rem;
  font-family: ${(props) => props.theme.systemFont};
  font-weight: 200;
  font-size: 14px;
  font-style: italic;
`;

export const Errors = styled(motion.ul)`
  display: block;
  list-style: none;
  padding: 0;
`;

export const Error = styled(motion.li)`
  color: ${(props) => props.theme.colors.caution};
  font-family: ${(props) => props.theme.systemFont};
`;

export const errorsAnimation = {
  initial: { opacity: 0, x: -50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 50 }
};

export const Required = styled.span`
  font-weight: bold;
  color: ${(props) => props.theme.colors.caution};
`;
