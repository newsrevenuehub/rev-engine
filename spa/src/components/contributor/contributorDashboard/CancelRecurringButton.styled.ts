import { ModalHeader as BaseHeader } from 'components/base';
import { Button as MuiButton } from '@material-ui/core';
import styled from 'styled-components';

export const ModalHeader = styled(BaseHeader)`
  color: ${({ theme }) => theme.basePalette.secondary.error};
  font-weight: 600;
`;

export const TableButton = styled(MuiButton)`
  && {
    text-transform: unset;
    font-weight: 700;
    font-size: ${(props) => props.theme.fontSizesUpdated.sm};
    color: ${(props) => props.theme.colors.error.primary};
  }
`;
