import styled from 'styled-components';
import { IconPreview } from '../PreviewButton';
import { Add } from '@material-ui/icons';

export const Preview = styled(IconPreview)<{ $disabled: boolean | null | undefined }>`
  background-color: ${(props) =>
    props.$disabled ? props.theme.colors.status.processing : props.theme.basePalette.primary.engineBlue};

  ${(props) =>
    !props.$disabled &&
    `
    &:hover {
      background-color: #188cc9;
    }

    &:active {
      background-color: ${props.theme.colors.muiLightBlue[500]};
    }
  `}
`;

export const AddIcon = styled(Add)`
  && {
    fill: ${({ theme }) => theme.basePalette.greyscale.white};
    height: 40px;
    width: 40px;
  }
`;
