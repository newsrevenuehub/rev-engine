import { Checkbox } from 'components/base';
import styled from 'styled-components';

export const Header = styled('h3')`
  font-family: Roboto, sans-serif;
  font-size: 16px;
  font-weight: 500;
  margin: 1rem 0;
`;

export const ThemedCheckbox = styled(Checkbox)`
  && {
    &.Mui-checked {
      color: ${({ theme }) => theme.colors.cstm_CTAs};
    }
  }
`;
