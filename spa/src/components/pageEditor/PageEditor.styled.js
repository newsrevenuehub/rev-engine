import styled from 'styled-components';

export const PageEditor = styled.div`
  /*
  Adjust to fill space that was padded out by the <Dashboard> container. 96px is
  the width of the buttons on the left side.
  */
  margin-bottom: -2rem;
  margin-left: calc(96px - 3rem);
  margin-top: -3rem;
  width: calc(100% - 8px);
`;

export const ButtonOverlay = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 30px;
  left: 0;
  padding: 30px 0;
  position: fixed;
  top: 48px; /* Height of the top bar */
  width: 96px;
`;
