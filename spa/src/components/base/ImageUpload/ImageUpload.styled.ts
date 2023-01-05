import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconButton as MuiIconButton } from '@material-ui/core';
import styled from 'styled-components';

export const IconButton = styled(MuiIconButton)`
  && {
    height: 50px;
    max-height: 50px;
    max-width: 50px;
    width: 50px;

    svg {
      height: auto;
      width: 12px;
    }

    &.Mui-disabled {
      opacity: 0.5;
    }
  }
`;

export const Label = styled.label`
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  font-weight: 500;
  padding-bottom: 0.5rem;
  grid-area: label;
`;

export const Preview = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  grid-area: preview;
  height: 100%;
  position: relative;
`;

export const Prompt = styled.div`
  align-items: center;
  border: 1px solid ${({ theme }) => theme.colors.grey[0]};
  display: flex;
  font-size: ${({ theme }) => theme.fontSizesUpdated.sm};
  height: 100%;
  justify-content: center;
`;

export const RemoveIcon = styled(FontAwesomeIcon)`
  color: ${(props) => props.theme.colors.caution};
`;

export const Root = styled.div`
  display: grid;
  grid-template-areas:
    'label label'
    'preview upload'
    'preview remove';
  grid-template-columns: 1fr 50px;
  max-height: 125px;
`;

export const Thumbnail = styled.img`
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
`;

export const UploadIcon = styled(FontAwesomeIcon)`
  color: ${(props) => props.theme.colors.primary};
`;
