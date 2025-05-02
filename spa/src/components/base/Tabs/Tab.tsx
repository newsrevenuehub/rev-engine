import { Tab as MuiTab } from '@material-ui/core';
import styled from 'styled-components';

export const Tab = styled(MuiTab)`
  && {
    color: ${({ theme }) => theme.basePalette.greyscale['70']};
    font:
      14px Roboto,
      sans-serif;
    min-width: 0;
    text-transform: none;

    &.Mui-selected {
      color: ${({ theme }) => theme.basePalette.greyscale.black};
      font-weight: 500;
    }
  }
`;

export default Tab;
