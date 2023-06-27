import { EditOutlined } from '@material-ui/icons';
import styled from 'styled-components';
import { IconPreview } from '../PreviewButton';

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

export const EditIcon = styled(EditOutlined)`
  && {
    fill: ${({ theme }) => theme.basePalette.greyscale.white};
  }
`;

export const Label = styled.div`
  align-items: center;
  display: flex;
  gap: 8px;
`;

export const PublishedBadge = styled.div`
  align-items: center;
  border-radius: ${({ theme }) => theme.muiBorderRadius.sm};
  background-color: ${({ theme }) => theme.colors.muiTeal[700]};
  font-size: ${({ theme }) => theme.fontSizesUpdated.xs};
  color: ${({ theme }) => theme.basePalette.greyscale.white};
  display: flex;
  font-weight: 600;
  height: 16px;
  justify-content: center;
  margin-left: 8px;
  margin-top: 6px;
  /* 1px is to optically center the text. */
  padding: 1px 0.5rem 0 0.5rem;
`;

export const PreviewImage = styled.div`
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
`;

export const PreviewPlaceholder = styled.div`
  align-items: center;
  background-color: ${({ theme }) => theme.basePalette.greyscale.grey3};
  color: ${({ theme }) => theme.basePalette.greyscale.grey1};
  display: flex;
  justify-content: center;
`;
