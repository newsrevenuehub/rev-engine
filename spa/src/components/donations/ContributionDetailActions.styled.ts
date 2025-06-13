import { ReportOutlined } from '@material-ui/icons';
import { Button as BaseButton } from 'components/base';
import styled from 'styled-components';

export const Root = styled.div`
  margin-bottom: 20px;
  text-align: right;
`;

export const Button = styled(BaseButton)`
  && {
    padding: 6px;
    min-width: 20px;
  }
`;

export const ModalHeaderIcon = styled(ReportOutlined)`
  && {
    color: ${({ theme }) => theme.colors.error.primary};
  }
`;

export const RedEmphasis = styled.strong`
  color: ${({ theme }) => theme.colors.error.primary};
`;
