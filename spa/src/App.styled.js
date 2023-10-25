import styled from 'styled-components';

export const AppWrapper = styled.div`
  min-height: 100vh;
  min-width: 100vw;
  display: flex;
  background: ${(props) => props.theme.colors.white};
`;
