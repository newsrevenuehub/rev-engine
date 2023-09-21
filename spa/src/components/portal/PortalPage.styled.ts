import styled from 'styled-components';

export const PoweredBy = styled.div`
  width: 100%;
  gap: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${(props) => props.theme.font.body};
  font-weight: 400;
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  color: ${(props) => props.theme.basePalette.greyscale.black};
  background: ${(props) => props.theme.basePalette.greyscale.grey4};
  padding-bottom: 45px;
`;
