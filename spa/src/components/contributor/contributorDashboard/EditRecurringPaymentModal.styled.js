import styled from 'styled-components';

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

export const EditRecurringPaymentModal = styled.div`
  font-family: ${(props) => props.theme.systemFont};
  overflow-y: auto;
  min-width: 350px;
  padding: 2rem;
  margin: 1rem;
  background: ${(props) => props.theme.colors.paneBackground};
  border-radius: ${(props) => props.theme.radii[0]};

  h2,
  button,
  p {
    font-family: ${(props) => props.theme.systemFont};
  }
`;

export const CurrentList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

export const CurrentDatum = styled.li`
  margin: 1rem;
  font-family: ${(props) => props.theme.systemFont};
  span {
    display: block;
  }
`;

export const Datum = styled.span`
  padding-left: 0.5rem;
  color: ${(props) => props.theme.colors.grey[2]};
`;

export const CardForm = styled.form`
  margin-top: 4rem;
`;

export const Description = styled.p``;

export const CardElementWrapper = styled.div`
  padding: 2rem 1rem;
  margin: 2rem 0;
  box-shadow: ${(props) => props.theme.shadows[2]};
`;

export const CompletedMessage = styled.div``;

export const PaymentError = styled.div`
  margin-bottom: 2rem;
  color: ${(props) => props.theme.colors.caution};
  font-family: ${(props) => props.theme.systemFont};
`;
