import styled from 'styled-components';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const ContributorTokenExpiredModal = styled.div`
  background: ${(props) => props.theme.colors.white};
  border-radius: ${(props) => props.theme.radii[0]};
  padding: 2rem;
`;

export const ExpiredMessage = styled.div``;

export const Icon = styled(FontAwesomeIcon)`
  display: block;
  margin: 0 auto;
  font-size: 48px;
  color: ${(props) => props.theme.colors.warning};
`;

export const Message = styled.h3`
  white-space: nowrap;
`;
