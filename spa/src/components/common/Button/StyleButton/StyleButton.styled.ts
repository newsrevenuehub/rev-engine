import { EditOutlined } from '@material-ui/icons';
import styled from 'styled-components';
import { IconPreview } from '../PreviewButton';

export const EditIcon = styled(EditOutlined)`
  && {
    fill: ${({ theme }) => theme.basePalette.greyscale.white};
  }
`;

export const HoverOverlay = styled(IconPreview)`
  background-color: #28282870;
  opacity: 0;
  z-index: 1;

  :active {
    background-color: ${({ theme }) => theme.colors.muiLightBlue[500] + '90'};
  }

  &:hover {
    opacity: 1;
  }
`;

export const LiveBadge = styled.div`
  align-items: center;
  background-color: ${({ theme }) => theme.basePalette.primary.engineBlue};
  border-bottom-left-radius: ${({ theme }) => theme.muiBorderRadius.sm};
  border-bottom-right-radius: ${({ theme }) => theme.muiBorderRadius.sm};
  display: flex;
  height: 24px;
  justify-content: center;
  margin-left: 8px;
  width: 24px;

  svg {
    height: 16px;
    fill: ${({ theme }) => theme.basePalette.greyscale.white};
    width: 16px;
  }
`;

export const Preview = styled.div`
  background-size: cover;
`;
