import { ButtonBase } from '@material-ui/core';
import { ArrowPopover as BaseArrowPopover } from 'components/common/ArrowPopover';
import styled from 'styled-components';

export const Button = styled(ButtonBase)`
  && {
    border-radius: ${({ theme }) => theme.muiBorderRadius.sm};
    padding: 4px;

    &:hover {
      background: ${({ theme }) => theme.basePalette.greyscale['10']};
      box-shadow: none;
    }

    &[aria-pressed='true'] {
      background: rgba(21, 124, 178, 0.1);

      svg {
        fill: ${({ theme }) => theme.basePalette.primary.engineBlue};
      }
    }

    svg {
      height: 20px;
      width: 20px;
    }
  }
`;

export const ArrowPopover = styled(BaseArrowPopover)`
  width: 580px;
  z-index: 10;
`;

export const PopoverHeader = styled.h2`
  color: ${({ theme }) => theme.basePalette.greyscale.black};
  font-size: ${({ theme }) => theme.fontSizesUpdated[20]};
  font-weight: 500;
  margin: 0 0 14px 0;
`;

export const PopoverText = styled.p`
  color: ${({ theme }) => theme.basePalette.greyscale.black};
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
`;
