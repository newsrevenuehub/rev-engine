import styled from 'styled-components';

export const MainHeader = styled.header`
  height: 60px;
  z-index: 2;
  padding: 1rem;
`;

export const InnerContent = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  max-width: ${(props) => props.theme.maxWidths.lg};
  margin: 0 auto;
  padding: 0 2rem;
`;
