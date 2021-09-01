import styled from 'styled-components';

export const AddStylesModal = styled.div`
  width: 800px;
  height: 95vh;
  background: ${(props) => props.theme.colors.paneBackground};
  border-radius: ${(props) => props.theme.radii[0]};
  overflow-y: auto;
`;
