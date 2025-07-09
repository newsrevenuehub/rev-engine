import { Button as MuiButton, ButtonProps as MuiButtonProps } from '@material-ui/core';
import { forwardRef } from 'react';
import styled from 'styled-components';
import { buttonColors, buttonSizes } from '../buttonStyles';

export interface ButtonProps extends Omit<MuiButtonProps, 'color' | 'size'> {
  color?: 'error' | 'information' | 'primaryDark' | 'primaryLight' | 'secondary' | 'text';
  size?: 'small' | 'medium' | 'large' | 'extraLarge';
}

const ButtonWrapper = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  // Destructuring to only pass expected props to the MUI component.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { color, size, ...rest } = props;

  return <MuiButton ref={ref} variant="contained" {...rest} />;
});

/**
 * @see https://v4.mui.com/api/button/
 */
const StyledMuiButton = styled(ButtonWrapper)<ButtonProps>`
  && {
    background-color: ${({ color }) => (color ? buttonColors[color].normal.bg : buttonColors.primaryLight.normal.bg)};
    border-radius: 6px;
    box-shadow: ${({ color }) =>
      color === 'text' ? 'none' : '0px 0.3px 0.5px rgba(0, 0, 0, 0.1), 0px 2px 4px rgba(0, 0, 0, 0.2)'};
    height: ${({ size }) => (size ? buttonSizes[size].height : buttonSizes.medium.height)};
    padding: ${({ size }) => (size ? buttonSizes[size].padding : buttonSizes.medium.padding)};

    .NreButtonLabel {
      color: ${({ color }) => (color ? buttonColors[color].normal.fg : buttonColors.primaryLight.normal.fg)};
      /* Used to sync icon color to label color when using (startIcon & endIcon) */
      fill: ${({ color }) => (color ? buttonColors[color].normal.fg : buttonColors.primaryLight.normal.fg)};
      font:
        600 14px Roboto,
        sans-serif;
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
      /* Used to sync icon color to label color when using (startIcon & endIcon) */
      fill: ${({ color }) => (color ? buttonColors[color].hover.fg : buttonColors.primaryLight.hover.fg)};
    }
  }

  &&[aria-pressed='true'] {
    box-shadow: none;
    background-color: ${({ color }) => (color ? buttonColors[color].active.bg : buttonColors.primaryLight.active.bg)};

    .NreButtonLabel {
      color: ${({ color }) => (color ? buttonColors[color].active.fg : buttonColors.primaryLight.active.fg)};
      /* Used to sync icon color to label color when using (startIcon & endIcon) */
      fill: ${({ color }) => (color ? buttonColors[color].active.fg : buttonColors.primaryLight.active.fg)};
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

export const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  // If we're using the outlined variant, disable the ripple because it
  // interferes with the intended appearance.

  const propOverrides: Partial<ButtonProps> = props.variant === 'outlined' ? { disableRipple: true } : {};

  return (
    <StyledMuiButton
      classes={{ label: 'NreButtonLabel', outlined: 'NreButtonOutlined' }}
      ref={ref}
      {...props}
      {...propOverrides}
    />
  );
});

export default Button;
