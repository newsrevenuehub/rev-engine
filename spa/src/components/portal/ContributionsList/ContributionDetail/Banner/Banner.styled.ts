import styled from 'styled-components';

export const Root = styled.div`
  display: grid;
  grid-template-columns: 24px 1fr;
  grid-template-rows: 24px auto;
  grid-template-areas: 'icon title' 'icon description';
  column-gap: 12px;
  row-gap: 7px;
  padding: 12px;
  border-radius: 6px;
  background: ${({ theme }) => theme.basePalette.greyscale['10']};
  margin: 0 40px 14px 40px;

  @media (${({ theme }) => theme.breakpoints.tabletLandscapeDown}) {
    grid-template-areas: 'icon title' 'description description';
    margin: 0;
    padding: 20px;
    row-gap: 15px;
    border-radius: 0;
  }
`;

export const IconWrapper = styled.div`
  grid-area: icon;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 24px;
  height: 24px;
  fill: ${({ theme }) => theme.basePalette.greyscale.black};
`;

export const Title = styled.div`
  grid-area: title;
  font-family: ${({ theme }) => theme.font.heading};
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  font-weight: 700;
  color: ${({ theme }) => theme.basePalette.greyscale.black};
  display: flex;
  align-items: center;
`;

export const Description = styled.div`
  grid-area: description;
  font-family: ${({ theme }) => theme.systemFont};
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  font-weight: 400;
  color: ${({ theme }) => theme.basePalette.greyscale.black};
`;
