import { IconButton } from '@material-ui/core';
import styled from 'styled-components';

export const CardIcon = styled('img')`
  height: 30px;
  margin-right: 0.8em;
  max-width: 45px;
`;

export const EditButton = styled(IconButton)`
  svg {
    color: #999;
  }
`;

export const LastFour = styled('span')`
  color: #999;
`;

export const Root = styled('div')`
  align-items: center;
  justify-content: space-between;
  display: flex;
`;
