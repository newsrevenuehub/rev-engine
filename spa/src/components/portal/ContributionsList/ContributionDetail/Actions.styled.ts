import styled from 'styled-components';

export const Root = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;

  margin-top: 84px;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    margin-top: 40px;
  }
`;
