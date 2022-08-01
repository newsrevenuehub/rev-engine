import { Button as MuiButton, Modal as MuiModal, IconButton as MuiIconButton } from '@material-ui/core';
import styled from 'styled-components';
import lighten from 'styles/utils/lighten';

export const UnsavedChangesModal = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow-y: auto;
  background: ${(props) => props.theme.colors.paneBackground};
  border-radius: ${(props) => props.theme.radii[2]};
  font-family: ${(props) => props.theme.systemFont};
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  padding: 1.25rem 1rem 1rem;
  gap: 0.5rem;
  border-bottom: 1px solid ${(props) => props.theme.colors.grey[0]};
`;

export const ModalTitle = styled.p`
  font-size: ${(props) => props.theme.fontSizesUpdated.lg};
  font-family: ${(props) => props.theme.systemFont};
  font-weight: 700;
  margin: 0;
`;

export const Description = styled.p`
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  padding: 1rem 1rem 0;
  margin: 0;
`;

export const Buttons = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 1.5rem 1rem 1.25rem;
  gap: 2rem;
`;

export const Icon = styled.div`
  > svg {
    height: 24px;
    width: 24px;
  }
  color: ${(props) =>
    ({
      grey: props.theme.colors.grey[1],
      error: props.theme.colors.error.primary
    }[props.type])};
`;

export const Button = styled(MuiButton)`
  && {
    font-size: ${(props) => props.theme.fontSizesUpdated.sm};
    font-weight: 600;
    padding-left: 2em;
    padding-right: 2em;
    ${(props) =>
      props.variety === 'error' &&
      `
      background-color: ${props.theme.colors.error.primary};
      color: ${props.theme.colors.white};

      :hover {
        background-color: ${lighten(props.theme.colors.error.primary)};
      }
    `}
  }
`;

export const Modal = styled(MuiModal)`
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const IconButton = styled(MuiIconButton)`
  && {
    position: absolute;
    right: 6px;
    top: 4px;
  }
`;
