import styled from 'styled-components';

export const Flex = styled.div`
  display: flex;
  flex-direction: column;
  align-items: start;
  gap: 12px;
  font-family: ${(props) => props.theme.systemFont};
`;

export const Content = styled.div`
  display: flex;
  gap: 30px;
`;

export const Label = styled.p`
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  font-weight: 500;
  margin: 0;
`;
