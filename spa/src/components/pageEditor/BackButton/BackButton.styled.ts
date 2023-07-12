import { IconButton as BaseIconButton } from 'components/base';
import styled from 'styled-components';

export const IconButton = styled(BaseIconButton)`
  && {
    background: none;
    box-shadow: none;

    svg {
      color: ${({ theme }) => theme.basePalette.greyscale.white};
      height: 24px;
      width: 24px;
    }

    &:hover {
      background: none;
      box-shadow: none;
    }
  }
`;
