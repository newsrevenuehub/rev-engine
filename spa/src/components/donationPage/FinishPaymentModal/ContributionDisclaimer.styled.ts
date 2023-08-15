import styled from 'styled-components';
import { Link as BaseLink } from 'components/base';

export const Root = styled.div`
  font-size: 13px; /* not in our theme, for now */
  font-style: italic;

  p {
    font-family: ${({ theme }) => theme.systemFont};
    margin: 0;
  }
`;

export const Link = styled(BaseLink)`
  font-weight: 700;
`;
