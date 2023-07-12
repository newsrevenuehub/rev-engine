import { IconButton as MuiIconButton, IconButtonProps as MuiIconButtonProps } from '@material-ui/core';
import { ForwardedRef, forwardRef } from 'react';
import styled from 'styled-components';
import { buttonColors, buttonSizes } from '../buttonStyles';

export interface IconButtonProps extends Omit<MuiIconButtonProps, 'color' | 'size'> {
  color?: 'error' | 'information' | 'primaryDark' | 'primaryLight' | 'secondary' | 'text';
  size?: 'small' | 'medium' | 'large' | 'extraLarge';
}

const IconButtonWrapper = forwardRef<HTMLButtonElement, IconButtonProps>((props, ref) => {
  const { color, size, ...rest } = props;

  return <MuiIconButton ref={ref} {...rest} />;
});

/**
 * @see https://v4.mui.com/api/icon-button/
 */
const StyledMuiIconButton = styled(IconButtonWrapper)<IconButtonProps>`
  && {
    background-color: ${({ color }) => (color ? buttonColors[color].normal.bg : buttonColors.primaryLight.normal.bg)};
    border-radius: 6px;
    box-shadow: ${({ color }) =>
      color === 'text' ? 'none' : '0px 0.3px 0.5px rgba(0, 0, 0, 0.1), 0px 2px 4px rgba(0, 0, 0, 0.2)'};
    height: ${({ size }) => (size ? buttonSizes[size].height : buttonSizes.medium.height)};
    padding: ${({ size }) => (size ? buttonSizes[size].padding : buttonSizes.medium.padding)};

    .NreButtonLabel {
      color: ${({ color }) => (color ? buttonColors[color].normal.fg : buttonColors.primaryLight.normal.fg)};
      font: 600 14px Roboto, sans-serif;
    }
  }

  &&:active {
    // Background color seems to be overridden by the ripple animation.

    .NreButtonLabel {
      color: ${({ color }) => (color ? buttonColors[color].active.fg : buttonColors.primaryLight.active.fg)};
    }
  }

  &&:hover {
    background-color: ${({ color }) => (color ? buttonColors[color].hover.bg : buttonColors.primaryLight.hover.bg)};
    box-shadow: ${({ color }) =>
      color === 'text' ? 'none' : '0px 0.3px 0.5px rgba(0, 0, 0, 0.1), 0px 2px 4px rgba(0, 0, 0, 0.2)'};

    .NreButtonLabel {
      color: ${({ color }) => (color ? buttonColors[color].hover.fg : buttonColors.primaryLight.hover.fg)};
    }
  }

  &&.NreButtonOutlined {
    background: none;
    border-color: white;
    box-shadow: none;
    mix-blend-mode: lighten; /* this causes anything colored #000 to become transparent */

    .NreButtonLabel {
      color: white;
    }

    &:active,
    &:hover:active {
      background: white;

      .NreButtonLabel {
        color: black;
      }
    }

    &:hover {
      background-color: rgba(255, 255, 255, 0.6);
    }

    /* We don't have a disabled appearance for this variant yet. */
  }

  &&.Mui-disabled {
    background-color: ${({ color }) =>
      color ? buttonColors[color].disabled.bg : buttonColors.primaryLight.disabled.bg};

    .NreButtonLabel {
      color: ${({ color }) => (color ? buttonColors[color].disabled.fg : buttonColors.primaryLight.disabled.fg)};
    }
  }
`;

export const IconButton = forwardRef((props: IconButtonProps, ref: ForwardedRef<HTMLButtonElement>) => {
  return <StyledMuiIconButton classes={{ label: 'NreButtonLabel' }} ref={ref} {...props} />;
});

export default IconButton;
