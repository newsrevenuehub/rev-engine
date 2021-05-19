import styled from 'styled-components';

export const Dashboard = styled.div`
  flex: 1;
  display: flex;
  flex-direction: row;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    flex-direction: column;
  }
`;

export const DashboardMain = styled.main`
  flex: 1;
  padding: 2rem;
  display: flex;
  flex-direction: column;
`;
