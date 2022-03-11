import styled from 'styled-components';
import SvgIcon from 'assets/icons/SvgIcon';
import Button from 'elements/buttons/Button';
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
  height: 25px;
  margin: 2rem 0;
`;

export const Icon = styled(SvgIcon)`
  height: 100%;
  width: auto;
  margin: 0 auto;
`;

export const PaymentError = styled.div`
  margin-bottom: 2rem;
  color: ${(props) => props.theme.colors.caution};
  font-family: ${(props) => props.theme.systemFont};
`;

export const PayWithCardOption = styled.p`
  cursor: pointer;
  font-family: ${(props) => props.theme.systemFont};
  font-size: ${(props) => props.theme.fontSizes[1]};
  font-style: italic;
  text-align: center;
  padding: 2rem;

  color: #4183c4;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

export const PaymentSubmitButton = styled(Button)`
  font-family: ${(props) => props.theme.systemFont};
`;

export const CardElementStyle = (theme) => ({
  base: {
    iconColor: '#666ee8',
    color: '#31325f',
    fontWeight: 400,
    fontFamily: theme.systemFont,
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

export const PayFeesWidget = styled.div`
  margin: 25px auto 0px;
  max-width: 450px;
  width: 100%;
`;
