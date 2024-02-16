import styled from 'styled-components';

export const TopMatter = styled.div`
  /* This styling will only apply in mobile viewports, when more than just
  Banner is visible. */
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

export const Content = styled.div`
  display: flex;
  flex-direction: column;
  /* No gap because each DetailSection has its own padding. */
`;

export const Root = styled.div`
  background-color: ${({ theme }) => theme.basePalette.greyscale.white};
  border-left: 4px solid ${({ theme }) => theme.basePalette.primary.purple};

  /* No horizontal padding because each DetailSection has its own padding, and
  its highlight needs to extend to the edges of this. */
  padding: 20px 0;
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
