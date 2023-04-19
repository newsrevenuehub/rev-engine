import { Tabs as MuiTabs, TabsProps as MuiTabsProps } from '@material-ui/core';
import styled from 'styled-components';

const StyledTabs = styled(MuiTabs)`
  && {
    box-shadow: inset 0 -1px 0 0 #eee;
    min-height: 50px;

    .NreTabsIndicator {
      background-color: ${({ theme }) => theme.basePalette.primary.purple};
    }
  }
`;

export type TabsProps = MuiTabsProps;

export function Tabs(props: TabsProps) {
  return <StyledTabs classes={{ indicator: 'NreTabsIndicator' }} {...props} />;
}

export default Tabs;
