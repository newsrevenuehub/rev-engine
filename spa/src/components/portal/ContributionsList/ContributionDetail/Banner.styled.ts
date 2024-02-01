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
  background: ${(props) => props.theme.basePalette.greyscale.grey3};
  margin-bottom: 30px;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    grid-template-areas: 'icon title' 'description description';
    row-gap: 15px;
    padding: 12px 21px 19px;
    border-radius: 0;

    /* Needed for the banner to be full width in mobile */
    margin-left: -20px;
    margin-right: -20px;
    margin-top: -16px;
  }
`;

export const IconWrapper = styled.div`
  grid-area: icon;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 24px;
  height: 24px;
  fill: ${(props) => props.theme.basePalette.greyscale.black};
`;

export const Title = styled.div`
  grid-area: title;
  font-family: ${(props) => props.theme.font.heading};
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  font-weight: 700;
  color: ${(props) => props.theme.basePalette.greyscale.black};
  display: flex;
  align-items: center;
`;

export const Description = styled.div`
  grid-area: description;
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  font-weight: 400;
  color: ${(props) => props.theme.basePalette.greyscale.black};
`;
