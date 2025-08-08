import styled from 'styled-components';
import { Field } from './common.styled';

export const Fields = styled.div`
  display: grid;
  gap: 25px;
  grid-template-columns: repeat(3, 1fr);
`;

export const OneUpField = styled(Field)`
  grid-column: span 3;
`;
