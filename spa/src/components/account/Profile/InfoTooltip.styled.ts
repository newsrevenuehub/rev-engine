import styled from 'styled-components';
import { InfoOutlined } from '@material-ui/icons';

export const Icon = styled(InfoOutlined)`
  && {
    height: 18px;
    width: 18px;
  }
`;

export const Tooltip = styled('span')`
  color: red;
  width: 400px;
`;
