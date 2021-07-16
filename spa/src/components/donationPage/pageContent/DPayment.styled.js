import styled from 'styled-components';
import SvgIcon from 'assets/icons/SvgIcon';
import { Radio as SemanticRadio } from 'semantic-ui-react';

export const DPayment = styled.div``;

export const NotLivePlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

export const NotLiveIcon = styled(SvgIcon)`
  height: 35px;
  width: auto;
`;

export const PayFees = styled.div`
  margin-bottom: 2rem;
`;

export const PayFeesQQ = styled.h5`
  font-size: ${(props) => props.theme.fontSizes[1]};
  font-weight: 500;
  margin: 1rem 0;
`;

export const Checkbox = styled(SemanticRadio)`
  &.ui.toggle.checkbox input:checked ~ .box:before,
  &.ui.toggle.checkbox input:checked ~ label:before {
    background-color: ${(props) => props.theme.colors.primary} !important;
  }
`;

export const PayFeesDescription = styled.p`
  font-size: ${(props) => props.theme.fontSizes[0]};
  line-height: 1.3;
  padding: 0.5rem 0;
  color: ${(props) => props.theme.colors.grey[4]};
`;
