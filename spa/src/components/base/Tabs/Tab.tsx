import { Tab as MuiTab } from '@material-ui/core';
import styled from 'styled-components';

export const Tab = styled(MuiTab)`
  && {
    color: #707070;
    font: 14px Roboto, sans-serif;
    min-width: 0;
    text-transform: none;

    &.Mui-selected {
      color: #282828;
      font-weight: 500;
    }
  }
`;

export default Tab;
