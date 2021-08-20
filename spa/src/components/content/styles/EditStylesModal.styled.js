import styled from 'styled-components';

export const EditStylesModal = styled.div`
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  background: ${(props) => props.theme.colors.paneBackground};
  border-radius: ${(props) => props.theme.radii[0]};
  overflow-y: auto;
`;

export const ModalTitle = styled.h2`
  text-align: center;
  padding: 2rem 4rem 0;
`;
