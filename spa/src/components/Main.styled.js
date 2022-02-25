import styled from 'styled-components';

export const Main = styled.div`
  min-height: 100vh;
  min-width: 100vw;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: ${(props) => props.theme.colors.fieldBackground};
`;
