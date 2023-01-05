import styled from 'styled-components';
import { Tabs as BaseTabs } from 'components/base';

export const Tabs = styled(BaseTabs)`
  background-color: ${({ theme }) => theme.colors.white};
  position: sticky;
  top: 0;
  /* To appear above the tab content, which has the default z-index. */
  z-index: 1;
`;
