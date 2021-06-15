import styled from 'styled-components';
import { Radio as SemanticRadio } from 'semantic-ui-react';

export const DAmount = styled.ul`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-gap: 20px;

  padding: 0;
  margin: 1.5rem 0;
`;

export const OtherAmount = styled.div`
  display: flex;
  justify-content: space-between;
  background: ${(props) => props.theme.colors.white};
  border: 1px solid;
  border-color: ${(props) => (props.selected ? props.theme.pageColorPrimary : props.theme.colors.inputBorder)};
  cursor: text;
  border-radius: ${(props) => props.theme.radii[1]};
  min-height: 48px;
  line-height: 48px;
  padding: 0 1rem;
  font-size: ${(props) => props.theme.fontSizes[1]};
  font-weight: 700;

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    font-size: ${(props) => props.theme.fontSizes[0]};
  }
`;

export const OtherAmountInput = styled.input`
  color: ${(props) => props.theme.colors.black};
  border: none;
  outline: none;
  padding: 0 1rem;
  min-width: 50px;
  width: 100%;
`;

export const PayFees = styled.div``;

export const PayFeesQQ = styled.h5`
  font-size: ${(props) => props.theme.fontSizes[1]};
  font-weight: 500;
  margin: 1rem 0;
`;

export const Checkbox = styled(SemanticRadio)`
  &.ui.toggle.checkbox input:checked ~ .box:before,
  &.ui.toggle.checkbox input:checked ~ label:before {
    background-color: ${(props) => props.theme.pageColorPrimary} !important;
  }
`;

export const PayFeesDescription = styled.p`
  font-size: ${(props) => props.theme.fontSizes[0]};
  line-height: 1.3;
  padding: 0.5rem 0;
  color: ${(props) => props.theme.colors.grey[4]};
`;
