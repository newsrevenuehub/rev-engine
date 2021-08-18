import styled from 'styled-components';
import { Radio as SemanticRadio } from 'semantic-ui-react';
import MaterialCheckbox from '@material-ui/core/Checkbox';

export const PaymentEditor = styled.div``;

export const PaymentTypesList = styled.ul`
  padding: 0;
  margin: 0 2rem;
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

export const OtherOptionsList = styled(PaymentTypesList)`
  border-top: 1px solid ${(props) => props.theme.colors.grey[1]};
`;

export const RadioWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  align-self: flex-end;
`;

export const Radio = styled(MaterialCheckbox)``;

export const RadioLabel = styled.label`
  font-size: 12px;
  font-style: italic;
`;
