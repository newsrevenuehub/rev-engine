import styled from 'styled-components';
import { Radio as SemanticRadio } from 'semantic-ui-react';

export const PaymentEditor = styled.ul`
  padding: 0;
  margin: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
`;

export const ToggleWrapper = styled.li`
  margin: 2rem 0 2rem 6rem;
`;

export const Toggle = styled(SemanticRadio)`
  &.ui.toggle.checkbox input:checked ~ .box:before,
  &.ui.toggle.checkbox input:checked ~ label:before {
    background-color: ${(props) => props.theme.colors.primary} !important;
  }
`;
