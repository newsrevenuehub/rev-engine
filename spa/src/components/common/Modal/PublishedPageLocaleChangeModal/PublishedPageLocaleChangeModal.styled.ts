import { ReportOutlined } from '@material-ui/icons';
import { ModalHeader as BaseModalHeader, ModalContent as BaseModalContent } from 'components/base';
import styled from 'styled-components';

export const ModalContent = styled(BaseModalContent)`
  width: 545px;
`;

export const ModalHeader = styled(BaseModalHeader)`
  color: ${({ theme }) => theme.colors.error.primary};
  font-weight: 600;
`;

export const ModalHeaderIcon = styled(ReportOutlined)`
  && {
    color: ${({ theme }) => theme.colors.error.primary};
  }
`;
