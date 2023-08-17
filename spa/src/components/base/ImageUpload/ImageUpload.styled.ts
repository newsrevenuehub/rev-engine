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

export const Slim = styled.div`
  position: relative;
  width: 432px;
  height: 76px;
  background-color: ${({ theme }) => theme.basePalette.greyscale.grey3};
  border-radius: ${({ theme }) => theme.muiBorderRadius.lg};
`;

export const SlimThumbnailWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64px;
  width: 64px;
  overflow: hidden;
`;

export const SlimThumbnail = styled.img`
  border-radius: ${({ theme }) => theme.muiBorderRadius.lg};
  max-height: 64px;
  max-width: 64px;
`;

export const PromptSlim = styled.div`
  align-items: center;
  border: 1px solid ${({ theme }) => theme.colors.grey[0]};
  display: flex;
  font-size: ${({ theme }) => theme.fontSizesUpdated.sm};
  height: 100%;
  width: 100%;
  justify-content: center;
`;

export const PreviewSlim = styled.button`
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  height: 100%;
  position: relative;
`;

export const FileNameSlim = styled.p`
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  color: ${({ theme }) => theme.basePalette.greyscale.grey1};
`;

export const IconButtonSlim = styled(MuiIconButton)`
  && {
    position: absolute;
    right: 5px;
    top: 14px;
    height: 50px;
    max-height: 50px;
    max-width: 50px;
    width: 50px;

    svg {
      fill: ${(props) => props.theme.basePalette.greyscale.grey1};
      width: 24px;
      height: 24px;
    }

    &.Mui-disabled {
      opacity: 0.5;
    }
  }
`;
