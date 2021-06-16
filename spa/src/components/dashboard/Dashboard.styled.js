import styled from 'styled-components';

export const Dashboard = styled.div`
  flex: 1;
  display: flex;
  flex-direction: row;

  height: 100vh;
  width: 100vw;
  overflow: hidden;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    flex-direction: column;
  }
`;

export const DashboardMain = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

export const DashboardContent = styled.main`
  padding: 4rem 2rem 0 2rem;
  flex: 1;
  display: flex;
  flex-direction: column;
`;
