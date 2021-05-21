import styled from 'styled-components';

export const Main = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

export const MainContent = styled.div`
  flex: 1;
  display: flex;
  padding: 0 2rem;
  @media (${(p) => p.theme.breakpoints.tabletLandscapeDown}) {
    padding: 0 0.5rem;
  }
`;
