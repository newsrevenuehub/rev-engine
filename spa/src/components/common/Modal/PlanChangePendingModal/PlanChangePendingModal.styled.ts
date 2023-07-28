import { ModalContent as BaseModalContent } from 'components/base';
import styled from 'styled-components';

export const HeaderIcon = styled.div`
  align-items: center;
  background-color: ${({ theme }) => theme.basePalette.primary.engineBlue};
  border-radius: 15px;
  display: flex;
  height: 30px;
  justify-content: center;
  width: 30px;

  svg {
    color: ${({ theme }) => theme.basePalette.greyscale.white};
    height: 24px;
    width: 24px;
  }
`;

export const ModalContent = styled(BaseModalContent)`
  width: 680px;
`;
