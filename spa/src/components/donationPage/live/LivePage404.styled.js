import styled from 'styled-components';

export const LivePage404 = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  background: ${(props) => props.theme.colors.fieldBackground};
`;

export const Wrapper = styled.div`
  margin-top: 10%;
`;

export const FourOhFour = styled.h2`
  display: block;
  font-size: ${(props) => props.theme.fontSizes[6]};
  font-weight: 900;
  text-transform: uppercase;
  text-align: center;
  color: ${(props) => props.theme.colors.grey[4]};
  margin: 0;
  padding: 0;
  margin-bottom: 1rem;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    font-size: ${(props) => props.theme.fontSizes[5]};
  }
`;

export const Description = styled.div``;
