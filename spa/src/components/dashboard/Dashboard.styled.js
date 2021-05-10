import styled from 'styled-components';

export const Dashboard = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

export const DashBody = styled.div`
  flex: 1;
  display: flex;
  flex-direction: row;

  @media (${(p) => p.theme.breakpoints.tabletLandscapeDown}) {
    flex-direction: column;
  }
`;

export const DashMain = styled.main`
  flex: 1;
  padding: 2rem;
  display: flex;
  flex-direction: column;
`;
