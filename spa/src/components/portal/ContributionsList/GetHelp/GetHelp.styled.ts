import styled from 'styled-components';

export const TitleTypography = styled.p`
  && {
    color: ${(props) => props.theme.basePalette.greyscale.black};
    font-size: ${(props) => props.theme.fontSizesUpdated[20]};
    line-height: ${(props) => props.theme.fontSizesUpdated.lgx};
    font-weight: 500;
    margin: 0 0 15px 0;
  }
`;

export const ContactTypography = styled.p`
  && {
    color: ${(props) => props.theme.basePalette.greyscale.black};
    font-size: ${(props) => props.theme.fontSizesUpdated.md};
    line-height: ${(props) => props.theme.fontSizesUpdated[20]};
    font-weight: 400;
    margin: 0;
  }
`;

export const ContactInfoDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 17px;
  margin-top: 18px;
  margin-left: 14px;
`;

export const ContactRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: ${({ theme }) => theme.fontSizesUpdated.lg};

  p {
    margin: 0;
    color: ${({ theme }) => theme.basePalette.greyscale.black};
  }

  svg {
    fill: ${({ theme }) => theme.basePalette.greyscale.black};
    height: 24px;
    width: 24px;
  }

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

export const LabelWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;
