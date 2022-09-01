import styled from 'styled-components';

export const Outer = styled.div``;

export const Dashboard = styled.div`
  flex: 1;
  display: flex;
  flex-direction: row;

  height: 100vh;
  width: 100vw;
  overflow: hidden;
`;

export const DashboardMain = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding-bottom: 2rem;
`;

export const DashboardContent = styled.main`
  padding: 3rem 3rem 0 3rem;
  flex: 1;
  display: flex;
  flex-direction: column;
`;
