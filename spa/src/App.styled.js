import styled from 'styled-components';

export const App = styled.div`
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  display: flex;
  background: ${(props) => props.theme.colors.fieldBackground};
`;
