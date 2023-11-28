import {
  CircularProgress as MuiCircularProgress,
  CircularProgressProps as MuiCircularProgressProps
} from '@material-ui/core';
import styled from 'styled-components';

export type CircularProgressProps = MuiCircularProgressProps;

const StyledMuiCircularProgress = styled(MuiCircularProgress)`
  && .NreCircle {
    color: ${({ theme }) => theme.basePalette.greyscale.grey1};
  }
`;

export function CircularProgress(props: CircularProgressProps) {
  return <StyledMuiCircularProgress {...props} classes={{ circle: 'NreCircle' }} />;
}

export default CircularProgress;
