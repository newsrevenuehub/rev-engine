import styled from 'styled-components';

export const Underlay = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(255, 255, 255, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
`;

export const ConnectProcessing = styled.h2`
  z-index: 101;
`;
