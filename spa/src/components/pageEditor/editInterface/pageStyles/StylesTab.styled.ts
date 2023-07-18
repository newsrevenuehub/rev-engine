import styled from 'styled-components';

export const Flex = styled.div`
  display: flex;
  flex-direction: column;
  gap: 40px;
`;

export const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const Title = styled.h1`
  font-family: ${(props) => props.theme.systemFont};
  color: ${(props) => props.theme.basePalette.greyscale.grey1};
  font-size: 24px;
  font-weight: 400;
  margin: 0;
`;

export const Pickers = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  flex-grow: 1;
  gap: 20px;
`;
