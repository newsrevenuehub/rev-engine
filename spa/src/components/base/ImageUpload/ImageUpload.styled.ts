import { IconButton as MuiIconButton } from '@material-ui/core';
import styled from 'styled-components';

export const ImageUploadWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const Label = styled.label`
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  font-weight: 500;
`;

export const Slim = styled.div`
  position: relative;
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
