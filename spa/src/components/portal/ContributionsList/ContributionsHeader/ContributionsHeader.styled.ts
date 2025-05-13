import styled from 'styled-components';

export const Controls = styled.div`
  display: flex;
  gap: 20px;
`;

export const Header = styled.h1`
  color: ${({ theme }) => theme.basePalette.primary.indigo};
  font-size: 34px;
`;

export const Message = styled.p`
  color: ${({ theme }) => theme.basePalette.greyscale['70']};
  font-size: ${({ theme }) => theme.fontSizesUpdated.lg};
`;

export const Root = styled.div`
  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    padding: 20px;
  }
`;
