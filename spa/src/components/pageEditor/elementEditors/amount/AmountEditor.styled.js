import styled from 'styled-components';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { baseInputStyles } from 'elements/inputs/BaseField.styled';
import { Radio as SemanticRadio } from 'semantic-ui-react';

export const AmountEditor = styled.ul`
  padding: 0;
  margin: 0;
  list-style: none;
  margin: 2rem 3rem 2rem 6rem;
`;

export const FreqGroup = styled.li`
  &:not(:last-child) {
    margin-bottom: 2rem;
  }
`;

export const FreqHeading = styled.h5`
  margin: 0;
`;

export const NoFreqs = styled.p``;

export const AmountsList = styled.ul`
  padding: 0;
  margin: 0;
  list-style: none;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
`;

export const AmountItem = styled.li`
  font-size: 14px;

  padding: 0.5rem;
  height: auto;
  width: 75px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;

  border-radius: 6px;
  background: ${(props) => props.theme.colors.fieldBackground};
  margin: 1rem;
  font-weight: bold;
  color: ${(props) => props.theme.colors.grey[3]};
`;

export const RemoveAmount = styled(FontAwesomeIcon)`
  color: ${(props) => props.theme.colors.caution};
  font-size: 16px;
  cursor: pointer;

  transition: all 0.1s ease-in-out;

  &:hover {
    transform: translate(-1px, -1px);
  }
  &:active {
    transform: translate(1px, 1px);
  }
`;

export const AmountInputGroup = styled.div`
  display: flex;
  flex-direction: row;
  margin: 2rem 0 1rem 1rem;

  & > div {
    flex: 1;
  }
`;

export const AmountInput = styled.input`
  ${baseInputStyles};
  padding: 0.5rem;
  height: auto;
  width: 75px;
  font-size: 14px;
  text-align: center;
  border-color: ${(props) => props.theme.colors.grey[0]};
`;

export const Toggles = styled.ul`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 1rem;
  list-style: none;
  border-top: 1px solid ${(props) => props.theme.colors.grey[0]};
`;

export const ToggleWrapper = styled.li`
  margin: 1rem 0;
`;

export const Toggle = styled(SemanticRadio)``;
