import styled from 'styled-components';
import Error from '@material-design-icons/svg/outlined/error.svg?react';

export const Root = styled.div`
  background: ${(props) => props.theme.colors.white};
  border-radius: ${(props) => props.theme.radii[0]};
  padding: 2rem;
`;

export const ExpiredMessage = styled.div``;

export const Icon = styled(Error)`
  fill: ${(props) => props.theme.colors.warning};
  height: 48px;
  display: block;
  margin: 0 auto;
  width: 48px;
`;

export const Message = styled.h3`
  white-space: nowrap;
`;
