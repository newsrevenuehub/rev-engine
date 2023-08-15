import { ButtonBase } from '@material-ui/core';
import styled from 'styled-components';

export const BackButton = styled(ButtonBase)`
  font-family: ${({ theme }) => theme.systemFont};
  justify-self: self-start;
  left: -6px;
  margin-top: 30px;
  position: relative;
`;

export const Root = styled.div`
  display: grid;
  gap: 24px;
  max-width: 450px;
  padding: 48px;
`;
