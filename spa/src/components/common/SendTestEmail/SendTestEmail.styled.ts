import styled from 'styled-components';

export const Flex = styled.div`
  margin: 4rem 0;
`;

export const Label = styled.p`
  font-size: ${(props) => props.theme.fontSizesUpdated.lgx};
  font-weight: 100;
  letter-spacing: 0.03em;
  color: ${(props) => props.theme.colors.black};
`;

export const ButtonWrapper = styled.div`
  display: flex;
  gap: 16px;
`;
