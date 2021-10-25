import styled from 'styled-components';
import MaterialCheckbox from '@material-ui/core/Checkbox';
import { motion } from 'framer-motion';
import { baseInputStyles } from 'elements/inputs/BaseField.styled';

export const ReasonEditor = styled.div`
  display: flex;
  flex-direction: column;
  margin: 2rem 3rem 2rem 6rem;
`;

export const ReasonsSection = styled.div`
  transition: border-width 0.05s linear;
  border: solid 0px ${(props) => props.theme.colors.grey[2]};
  border-width: ${(props) => (props.isExpanded ? '2px' : '0px')};
  margin-bottom: 4rem;
`;

export const CreateReasons = styled(motion.ul)`
  margin: 0;
  padding: 0 2rem;
`;

export const ReasonsLabel = styled.label`
  font-size: ${(props) => props.theme.fontSizes[1]};
`;

export const ReasonItem = styled.li`
  font-size: 14px;
  margin: 0.5rem;

  padding: 0.5rem;
  height: auto;
  max-width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;

  border-radius: 6px;
  background: ${(props) => props.theme.colors.fieldBackground};
  color: ${(props) => props.theme.colors.grey[3]};

  & button {
    margin-left: 0.5rem;
  }
`;

export const ReasonInput = styled.input`
  ${baseInputStyles};
  padding: 0.5rem;
  height: auto;
  width: 100%;
  font-size: 14px;
  border-color: ${(props) => props.theme.colors.grey[0]};
`;

export const reasonsAnimation = {
  initial: { x: -10, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -10, opacity: 0 }
};

export const CheckboxWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export const Checkbox = styled(MaterialCheckbox)``;

export const CheckboxLabel = styled.label`
  font-size: ${(props) => props.theme.fontSizes[1]};
`;

export const OtherSection = styled.div`
  & > div {
    margin-bottom: 4rem;
  }
`;
