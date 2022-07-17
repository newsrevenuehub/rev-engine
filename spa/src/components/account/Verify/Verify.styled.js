import styled from 'styled-components';

export const Verify = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const Outer = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin: 0px;
  display: flex;
  width: 100%;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeUp}) {
    height: 100vh;
  }
`;

export const Left = styled.div`
  background-color: red;
  flex: 30%;
  margin: 0px;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    flex: 100%;
  }
`;

export const Right = styled.div`
  flex: 70%;
  background-color: blue;
  margin: 0px;
  display: flex;
  justify-content: center;
  align-items: center;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    flex: 100%;
  }
`;
