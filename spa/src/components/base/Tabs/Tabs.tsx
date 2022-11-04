import { Tabs as MuiTabs } from '@material-ui/core';
import styled from 'styled-components';

export const Tabs = styled(MuiTabs)`
  && {
    box-shadow: inset 0 -1px 0 0 #eee;
    min-height: 50px;

    .MuiTabs-indicator {
      background-color: #523a5e;
    }
  }
`;

export default Tabs;
