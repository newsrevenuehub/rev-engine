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
  gap: 30px;
`;

export const Root = styled.div`
  background-color: ${({ theme }) => theme.basePalette.greyscale.white};
  border-left: 4px solid ${({ theme }) => theme.basePalette.primary.purple};
  padding: 20px 40px;
  align-self: self-start;

  /* useDetailAnchor will set this variable on us. */
  transform: translateY(var(--two-column-vertical-offset));

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    border-left: none;
    padding: 0;
    transform: none;
  }
`;

export const Desktop = styled.div`
  display: block;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    display: none;
  }
`;
