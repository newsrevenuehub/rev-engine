import { Button as MuiButton, ButtonProps as MuiButtonProps } from '@material-ui/core';
import { forwardRef } from 'react';
import styled from 'styled-components';
import { revEngineTheme } from 'styles/themes';

export interface ButtonProps extends Omit<MuiButtonProps, 'color' | 'size'> {
  color?: 'error' | 'information' | 'primaryDark' | 'primaryLight' | 'secondary' | 'text';
  size?: 'small' | 'medium' | 'large' | 'extraLarge';
}

const ButtonWrapper = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const { color, size, ...rest } = props;

  return <MuiButton ref={ref} variant="contained" {...rest} />;
});

// To make the style declarations easier to follow, size and color dependent
// properties are pulled out here.

const colors = {
  error: {
    active: { bg: '#8c162c', fg: '' },
    disabled: { bg: '#e86f85', fg: revEngineTheme.basePalette.greyscale.grey4 },
    hover: { bg: '#a01a32', fg: '' },
    normal: { bg: revEngineTheme.basePalette.secondary.error, fg: revEngineTheme.basePalette.greyscale.white }
  },
  information: {
    // We don't have active or disabled colors yet.
    active: { bg: '', fg: '' },
    disabled: { bg: revEngineTheme.basePalette.primary.engineBlue, fg: revEngineTheme.basePalette.greyscale.white },
    hover: { bg: '#7eb3d1', fg: '' },
    normal: { bg: revEngineTheme.basePalette.primary.engineBlue, fg: revEngineTheme.basePalette.greyscale.white }
  },
  primaryDark: {
    active: { bg: revEngineTheme.basePalette.indigo[-10], fg: '' },
    disabled: { bg: revEngineTheme.basePalette.purple[-80], fg: '#f9f9f9' },
    hover: { bg: revEngineTheme.basePalette.indigo[-60], fg: '' },
    normal: { bg: revEngineTheme.basePalette.primary.purple, fg: revEngineTheme.basePalette.greyscale.white }
  },
  primaryLight: {
    active: { bg: '#edff14', fg: '' },
    disabled: { bg: revEngineTheme.basePalette.chartreuse['-50'], fg: revEngineTheme.basePalette.greyscale.grey1 },
    hover: { bg: revEngineTheme.basePalette.chartreuse['-50'], fg: '' },
    normal: { bg: revEngineTheme.basePalette.primary.chartreuse, fg: revEngineTheme.basePalette.greyscale.black }
  },
  secondary: {
    active: { bg: revEngineTheme.basePalette.greyscale.grey1, fg: '' },
    disabled: { bg: revEngineTheme.basePalette.greyscale.grey4, fg: revEngineTheme.basePalette.greyscale.grey2 },
    hover: { bg: revEngineTheme.basePalette.greyscale.grey2, fg: '' },
    normal: { bg: revEngineTheme.basePalette.greyscale.grey3, fg: revEngineTheme.basePalette.greyscale.black }
  },
  text: {
    active: { bg: 'rgba(40, 40, 40, 0.06)', fg: revEngineTheme.basePalette.primary.indigo },
    disabled: { bg: 'transparent', fg: revEngineTheme.basePalette.greyscale.grey2 },
    hover: { bg: 'transparent', fg: revEngineTheme.basePalette.greyscale.black },
    normal: { bg: 'transparent', fg: revEngineTheme.basePalette.greyscale.grey1 }
  }
};

const sizes = {
  small: {
    height: '32px',
    padding: '8px'
  },
  medium: {
    height: '36px',
    padding: '10px'
  },
  large: {
    height: '40px',
    padding: '12px'
  },
  extraLarge: {
    height: '48px',
    padding: '16px'
  }
};

/**
 * @see https://v4.mui.com/api/button/
 */
const StyledMuiButton = styled(ButtonWrapper)<ButtonProps>`
  && {
    background-color: ${({ color }) => (color ? colors[color].normal.bg : colors.primaryLight.normal.bg)};
    border-radius: 6px;
    box-shadow: ${({ color }) =>
      color === 'text' ? 'none' : '0px 0.3px 0.5px rgba(0, 0, 0, 0.1), 0px 2px 4px rgba(0, 0, 0, 0.2)'};
    height: ${({ size }) => (size ? sizes[size].height : sizes.medium.height)};
    padding: ${({ size }) => (size ? sizes[size].padding : sizes.medium.padding)};

    .NreButtonLabel {
      color: ${({ color }) => (color ? colors[color].normal.fg : colors.primaryLight.normal.fg)};
      font: 600 14px Roboto, sans-serif;
    }
  }

  &&:active {
    // Background color seems to be overridden by the ripple animation.

    .NreButtonLabel {
      color: ${({ color }) => (color ? colors[color].active.fg : colors.primaryLight.active.fg)};
    }
  }

  &&:hover {
    background-color: ${({ color }) => (color ? colors[color].hover.bg : colors.primaryLight.hover.bg)};
    box-shadow: ${({ color }) =>
      color === 'text' ? 'none' : '0px 0.3px 0.5px rgba(0, 0, 0, 0.1), 0px 2px 4px rgba(0, 0, 0, 0.2)'};

    .NreButtonLabel {
      color: ${({ color }) => (color ? colors[color].hover.fg : colors.primaryLight.hover.fg)};
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
    background-color: ${({ color }) => (color ? colors[color].disabled.bg : colors.primaryLight.disabled.bg)};

    .NreButtonLabel {
      color: ${({ color }) => (color ? colors[color].disabled.fg : colors.primaryLight.disabled.fg)};
    }
  }
`;

export function Button(props: ButtonProps) {
  // If we're using the outlined variant, disable the ripple because it
  // interferes with the intended appearance.

  const propOverrides: Partial<ButtonProps> = props.variant === 'outlined' ? { disableRipple: true } : {};

  return (
    <StyledMuiButton
      classes={{ label: 'NreButtonLabel', outlined: 'NreButtonOutlined' }}
      {...props}
      {...propOverrides}
    />
  );
}

export default Button;
