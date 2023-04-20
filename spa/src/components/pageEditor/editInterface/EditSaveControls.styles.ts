import styled from 'styled-components';
import { Button as BaseButton } from 'components/base';

export const Root = styled.div`
  background: white;
  border-top: 1px solid ${({ theme }) => theme.basePalette.greyscale.grey2};
  display: flex;
  gap: 14px;
  justify-content: flex-end;
  left: 0;
  padding: 28px;
  position: sticky;
  right: 0;
  bottom: 0;
`;

export const Button = styled(BaseButton)`
  width: 125px;
`;
