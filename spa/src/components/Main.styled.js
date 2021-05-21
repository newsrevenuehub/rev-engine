import styled from 'styled-components';

export const Main = styled.div``;

export const MainContent = styled.div`
  flex: 1;
  display: flex;
  padding: 0 2rem;
  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    padding: 0 0.5rem;
  }
`;
