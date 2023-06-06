import ReportOutlined from '@material-ui/icons/ReportOutlined';
import { ModalContent as BaseModalContent } from 'components/base';
import styled from 'styled-components';

export const ModalContent = styled(BaseModalContent)`
  width: 650px;
`;

export const ModalHeaderIcon = styled(ReportOutlined)`
  && {
    color: ${({ theme }) => theme.colors.error.primary};
  }
`;

export const RedEmphasis = styled.strong`
  color: ${({ theme }) => theme.colors.error.primary};
`;
