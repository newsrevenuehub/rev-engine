import styled from 'styled-components';

export const Root = styled.div`
  background-color: ${({ theme }) => theme.basePalette.greyscale.white};
  border-left: 4px solid ${({ theme }) => theme.basePalette.primary.purple};
  padding: 40px 35px;
  align-self: self-start;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    border-left: none;
    padding: 0;
  }
`;

export const Loading = styled.div`
  align-items: center;
  display: grid;
  height: 500px; /* Roughly match height once loaded */
  justify-content: center;
`;
