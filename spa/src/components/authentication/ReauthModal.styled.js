import styled from 'styled-components';
import RevEngineModal from 'elements/modal/Modal';

export const Modal = styled(RevEngineModal)`
  top: 30%;
`;

export const ReauthModal = styled.div`
  height: 300px;
  background: ${(props) => props.theme.colors.white};
`;
