import styled from 'styled-components';

export const Root = styled.div`
  background-color: ${({ theme }) => theme.basePalette.greyscale.white};
  border-left: 4px solid ${({ theme }) => theme.basePalette.primary.purple};
  padding: 40px 35px;
  align-self: self-start;

  /* useDetailAnchor will set this variable on us. */
  transform: translateY(var(--two-column-vertical-offset));

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    border-left: none;
    padding: 0;
    transform: none;
  }
`;

export const Loading = styled.div`
  align-items: center;
  display: grid;
  height: 500px; /* Roughly match height once loaded */
  justify-content: center;
`;

export const Desktop = styled.div`
  display: block;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    display: none;
  }
`;
