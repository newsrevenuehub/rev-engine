import { Button as MuiButton, ButtonProps as MuiButtonProps } from '@material-ui/core';
import { forwardRef } from 'react';
import styled from 'styled-components';

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
    disabled: { bg: '#e86f85', fg: '#f9f9f9' },
    hover: { bg: '#a01a32', fg: '' },
    normal: { bg: '#c8203f', fg: '#fff' }
  },
  information: {
    // We don't have active or disabled colors yet.
    active: { bg: '', fg: '' },
    disabled: { bg: '#157cb2', fg: '#fff' },
    hover: { bg: '#7eb3d1', fg: '' },
    normal: { bg: '#157cb2', fg: '#fff' }
  },
  primaryDark: {
    active: { bg: '#3d2947', fg: '' },
    disabled: { bg: '#ded3e4', fg: '#f9f9f9' },
    hover: { bg: '#9a73ae', fg: '' },
    normal: { bg: '#523a5e', fg: '#fff' }
  },
  primaryLight: {
    active: { bg: '#edff14', fg: '' },
    disabled: { bg: '#f9ffac', fg: '#707070' },
    hover: { bg: '#f9ffac', fg: '' },
    normal: { bg: '#f2ff59', fg: '#282828' }
  },
  secondary: {
    active: { bg: '#707070', fg: '' },
    disabled: { bg: '#f9f9f9', fg: '#c4c4c4' },
    hover: { bg: '#c4c4c4', fg: '' },
    normal: { bg: '#f1f1f1', fg: '#282828' }
  },
  text: {
    active: { bg: 'rgba(40, 40, 40, 0.06)', fg: '#25192b' },
    disabled: { bg: 'transparent', fg: '#c4c4c4' },
    hover: { bg: 'transparent', fg: '#282828' },
    normal: { bg: 'transparent', fg: '#707070' }
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

  &&.Mui-disabled {
    background-color: ${({ color }) => (color ? colors[color].disabled.bg : colors.primaryLight.disabled.bg)};

    .NreButtonLabel {
      color: ${({ color }) => (color ? colors[color].disabled.fg : colors.primaryLight.disabled.fg)};
    }
  }
`;

export function Button(props: ButtonProps) {
  return <StyledMuiButton classes={{ label: 'NreButtonLabel' }} {...props} />;
}

export default Button;
