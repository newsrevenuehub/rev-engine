import styled from 'styled-components';

export const Label = styled.p`
  font-size: ${(props) => props.theme.fontSizesUpdated.lgx};
  font-weight: 400;
  color: ${(props) => props.theme.basePalette.greyscale.grey1};
  margin-bottom: 20px;
  line-height: normal;
`;

export const Description = styled.p`
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  font-weight: 400;
  color: ${(props) => props.theme.basePalette.greyscale.grey1};
  margin-bottom: 20px;
  line-height: normal;
`;

export const Preview = styled.p`
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  font-weight: 400;
  color: ${(props) => props.theme.basePalette.greyscale.black};
  margin-bottom: 30px;
  line-height: normal;
`;

export const ButtonWrapper = styled.div`
  display: flex;
  gap: 16px;
`;
