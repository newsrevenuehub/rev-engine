import styled from 'styled-components';
import { makeStyles } from '@material-ui/core/styles';

export default makeStyles((theme) => ({
  searchbar: {
    [theme.breakpoints.up('md')]: {
      maxWidth: 228
    }
  }
}));

export const Flex = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 2rem;
  margin-bottom: 2rem;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    flex-direction: column;
  }
`;

export const RightAction = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    flex-direction: column;
  }
`;
