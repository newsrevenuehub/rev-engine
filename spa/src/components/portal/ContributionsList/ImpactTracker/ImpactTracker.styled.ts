import styled from 'styled-components';

export const ImpactWrapper = styled.div`
  background: linear-gradient(273.72deg, #523a5e 73.63%, #60e0f9 177.02%);
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.basePalette.indigo['-50']};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 25px;
  max-height: 86px;

  & svg {
    fill: ${({ theme }) => theme.basePalette.greyscale.white};
    height: 34px;
    width: 34px;
  }

  @media (max-width: 768px) {
    padding: 12px;

    & svg {
      height: 24px;
      width: 24px;
    }
  }
`;

export const TitleWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 17px;

  @media (max-width: 768px) {
    gap: 8px;
  }
`;

export const Title = styled.p`
  color: ${({ theme }) => theme.basePalette.greyscale.white};
  font-size: ${({ theme }) => theme.fontSizesUpdated.lgx};
  font-weight: 400;
  margin: 0;

  @media (max-width: 768px) {
    font-size: ${({ theme }) => theme.fontSizesUpdated.lg};
  }
`;

export const ContributionWrapper = styled.div`
  margin-right: 20px;

  @media (max-width: 768px) {
    margin: 0;
  }
`;

export const Subtitle = styled.p`
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.basePalette.greyscale.white};
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  font-weight: 400;
  margin: 0 0 7px 0;
  text-align: right;
  line-height: 21px;

  & svg {
    height: 16px;
    width: 16px;
  }

  @media (max-width: 768px) {
    font-size: ${({ theme }) => theme.fontSizesUpdated.sm};
    margin-bottom: 5px;
    line-height: 16px;
  }
`;

export const TotalText = styled.p`
  color: ${({ theme }) => theme.basePalette.greyscale.white};
  font-size: ${({ theme }) => theme.fontSizesUpdated.lgx};
  text-align: right;
  font-weight: 600;
  margin: 0;
  line-height: 28px;

  @media (max-width: 768px) {
    font-size: ${({ theme }) => theme.fontSizesUpdated.lg};
    line-height: 21px;
  }
`;
