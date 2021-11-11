import styled, { css } from 'styled-components';
import { baseInputStyles } from 'elements/inputs/BaseField.styled';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const SelectWrapper = styled.div`
  position: relative;
  max-width: ${(props) => props.maxWidth};
`;

export const Select = styled.input`
  ${baseInputStyles};
  position: relative;
  text-align: left;
  width: 100%;
  padding-right: 2rem;
  cursor: default;
  caret-color: transparent;
`;

export const CaretWrapper = styled(motion.span)`
  position: absolute;
  right: 10px;
  top: 50%;
  height: 0;
  display: inline-block;
  pointer-events: none;
`;

export const Caret = styled(FontAwesomeIcon)`
  color: ${(props) => props.theme.colors.grey[3]};
  transform: translateY(-50%);
`;

export const List = styled.ul`
  display: ${(props) => (props.isOpen ? 'block' : 'None')};
  position: absolute;
  padding: 0;
  margin: 0;

  ${(props) => {
    if (props.dropdownPosition === 'above')
      return css`
        bottom: 100%;
      `;
    else
      return css`
        top: 100%;
      `;
  }}
  min-width: 100%;
  max-height: 300px;
  z-index: 2;
  list-style: none;
  background: ${(props) => props.theme.colors.inputBackground};
  box-shadow: ${(props) => props.theme.shadows[2]};
  border-radius: ${(props) => props.theme.radii[0]};
  border: 1px solid;
  border-color: ${(props) => props.theme.colors.grey[2]};

  overflow-y: auto;
`;

export const Item = styled.li`
  padding: 1rem 1.5rem;
  background: ${(props) => (props.highlighted ? props.theme.colors.grey[0] : 'transparent')};
`;
