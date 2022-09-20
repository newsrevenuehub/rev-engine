import styled from 'styled-components';

export const Form = styled('form')`
  display: grid;
  gap: 25px;
  grid-template-columns: 1fr 1fr;
`;

export const FillRow = styled('div')`
  grid-column: 1 / span 2;
`;
