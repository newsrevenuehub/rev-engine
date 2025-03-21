import { Error } from '@material-ui/icons';
import styled from 'styled-components';

export const Icon = styled(Error)`
  color: ${({ theme }) => theme.basePalette.secondary.error};
`;

export const Root = styled.div`
  align-items: center;
  background-color: ${({ theme }) => theme.basePalette.red['-90']};
  border-radius: ${({ theme }) => theme.muiBorderRadius.lg};
  display: flex;
  gap: 8px;
  padding: 10px 12px;
`;
