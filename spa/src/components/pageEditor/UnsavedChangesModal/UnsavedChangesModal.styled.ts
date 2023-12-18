import { ReportOutlined } from '@material-ui/icons';
import styled from 'styled-components';
import { ModalHeader as BaseModalHeader } from 'components/base';

export const Content = styled.p`
  font-family: ${({ theme }) => theme.systemFont};
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  margin: 0;
  width: 260px;
`;

export const HeaderIcon = styled(ReportOutlined)`
  color: ${({ theme }) => theme.basePalette.secondary.error};
`;

export const ModalHeader = styled(BaseModalHeader)`
  font-weight: 700;
`;
