import styled from 'styled-components';
import SvgIcon from 'assets/icons/SvgIcon';

export const StripePaymentForm = styled.div``;

export const PaymentRequestWrapper = styled.div``;

export const PaymentElementWrapper = styled.div`
  margin-bottom: 2rem;

  /* This is how we style the inputs inside the element */
  .StripeElement {
    padding: 0.5rem 0;
    border-bottom: 1px solid ${(props) => props.theme.colors.grey[1]};
  }
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
  padding: 1rem 0;
  color: ${(props) => props.theme.colors.caution};
`;

export const CardElementStyle = (theme) => ({
  base: {
    iconColor: '#666ee8',
    color: '#31325f',
    fontWeight: 400,
    fontFamily: theme.font,
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
