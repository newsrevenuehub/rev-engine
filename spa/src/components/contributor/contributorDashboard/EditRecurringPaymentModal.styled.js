import styled from 'styled-components';

export const EditRecurringPaymentModal = styled.div`
  overflow-y: auto;
  min-width: 350px;
  padding: 2rem;
  margin: 1rem;
  background: ${(props) => props.theme.colors.paneBackground};
  border-radius: ${(props) => props.theme.radii[0]};
`;

export const CurrentList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

export const CurrentDatum = styled.li`
  margin: 1rem;
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
