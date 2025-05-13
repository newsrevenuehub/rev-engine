import { IconButton } from 'components/base';
import styled from 'styled-components';

export const Arrow = styled.div`
  height: 20px;
  position: absolute;
  width: 30px;
  z-index: 1;

  &::before,
  &::after {
    content: '';
    height: 0;
    position: absolute;
    width: 0;
  }

  // The x-placement attribute is set on the parent element by Popper.js.

  [x-placement='bottom'] & {
    transform: translateY(calc(-100% + 1px));

    // Create two CSS triangles, then offset them slightly to create a border
    // effect. We also need the white one to overlap the content element as well
    // so that the border between the arrow and the content is erased.

    &::before {
      top: 0;
      left: 0;
      border-left: 15px solid transparent;
      border-right: 15px solid transparent;
      border-bottom: 20px solid ${({ theme }) => theme.basePalette.greyscale['10']};
    }

    &::after {
      top: 1px;
      left: 1px;
      border-left: 14px solid transparent;
      border-right: 14px solid transparent;
      border-bottom: 19px solid ${({ theme }) => theme.basePalette.greyscale.white};
    }
  }

  [x-placement='top'] & {
    bottom: 0;
    transform: translateY(calc(100% - 1px));

    &::before {
      position: absolute;
      top: 0;
      left: 0;
      border-left: 15px solid transparent;
      border-right: 15px solid transparent;
      border-top: 20px solid ${({ theme }) => theme.basePalette.greyscale['10']};
    }

    &::after {
      top: -1px;
      left: 1px;
      border-left: 14px solid transparent;
      border-right: 14px solid transparent;
      border-top: 19px solid ${({ theme }) => theme.basePalette.greyscale.white};
    }
  }
`;

export const CloseButton = styled(IconButton)`
  && {
    background: none;
    box-shadow: none;
    position: absolute;
    top: 0;
    right: 0;

    &:hover {
      background: none;
      box-shadow: none;
    }

    svg {
      fill: ${({ theme }) => theme.basePalette.greyscale['30']};
    }
  }
`;

export const Content = styled.div`
  background-color: ${({ theme }) => theme.basePalette.greyscale.white};
  border: 1px solid ${({ theme }) => theme.basePalette.greyscale['10']};
  border-radius: ${({ theme }) => theme.muiBorderRadius.xl};
  box-shadow: 0px 11px 20px 0px rgba(40, 40, 40, 0.1);
  // Additional padding on the right for the close button.
  padding: 24px 48px 24px 24px;
  position: relative;
`;
