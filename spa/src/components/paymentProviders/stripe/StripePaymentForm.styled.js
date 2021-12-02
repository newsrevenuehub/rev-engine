import styled from 'styled-components';
import SvgIcon from 'assets/icons/SvgIcon';
import { baseInputStyles } from 'elements/inputs/BaseField.styled';

export const StripePaymentForm = styled.div``;

export const PaymentRequestWrapper = styled.div``;

export const PaymentElementWrapper = styled.div`
  margin-bottom: 2rem;

  ${baseInputStyles};
  height: auto;
  padding: 1rem;
`;

export const EnterValidAmount = styled.h5``;

export const IconWrapper = styled.div`
  display: flex;
  justify-content: center;
`;

export const Icon = styled(SvgIcon)`
  width: 100px;
  height: auto;
`;

export const PaymentError = styled.div`
  margin-bottom: 2rem;
  color: ${(props) => props.theme.colors.caution};
`;

export const PayWithCardOption = styled.p`
  cursor: pointer;
  color: ${(props) => props.theme.colors.primary};
  font-size: ${(props) => props.theme.fontSizes[1]};
  font-style: italic;
  text-align: center;
  padding: 2rem;
`;

export const CardElementStyle = (theme) => ({
  base: {
    iconColor: '#666ee8',
    color: '#31325f',
    fontWeight: 400,
    fontFamily: 'Helvetica',
    fontSmoothing: 'antialiased',
    fontSize: theme.fontSizes[1],
    '::placeholder': {
      color: '#aab7c4'
    },
    ':-webkit-autofill': {
      color: '#666ee8'
    }
  },
  invalid: {
    color: '#fa755a',
    iconColor: '#fa755a'
  }
});

export const PaymentRequestButtonStyle = {
  paymentRequestButton: {
    type: 'donate',
    theme: 'light-outline',
    height: '64px'
  }
};
