import styled from 'styled-components';

export const MainContentBlocker = styled.div`
  background: rgba(0, 0, 0, 0.7);
  position: absolute;
  height: 100%;
  width: 100%;
  z-index: 1000;

  /* justify-content: center; */
  /* align-items: center; */
`;

export const BlockMessage = styled.p`
  font-size: ${(props) => props.theme.fontSizes[2]};
  padding-top: 10%;
  margin-left: 5%;
  color: white;
`;
