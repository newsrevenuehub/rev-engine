// This extends Styled Components's theme with our own properties. TODO: make
// this easier to use. It's currently a reflection of the ad hoc nature of our
// theme currently.
// See https://styled-components.com/docs/api#typescript

import 'styled-components';

declare module 'styled-components' {
  export interface DefaultTheme {
    colors: {
      primary: string;
      primaryLight: string;
      secondary: string;
      fieldBackground: string;
      paneBackground: string;
      inputBackground: string;
      inputBorder: string;
      sidebarBackground: string;
      topbarBackground: string;
      navSelectedBackground: string;
      navSectionLabelColor: string;
      black: string;
      account: {
        purple: string[];
        yellow: string[];
        blueLink: string;
      };
      white: string;
      grey: string[];
      muiLightBlue: {
        200: string;
        500: string;
        800: string;
      };
      muiTeal: {
        600: string;
        700: string;
      };
      muiYellow: {
        A50: string;
        A100: string;
      };
      muiGrey: {
        50: string;
        100: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
      };
      status: {
        processing: string;
        done: string;
        failed: string;
        warning: string;
      };
      error: {
        primary: string;
        bg: string;
      };
      caution: string;
      info: string;
      success: string;
      warning: string;
      disabled: string;
      link: string;
      hover: string;
      tableRowHover: string;
      tableRowActive: string;
      cstm_CTAs?: string;
    };
    buttons: {
      yellow: {
        background: string;
        backgroundLight: string;
        border: string;
        boxShadow: string;
        borderRadius: string;
        color: string;
      };
      blue: {
        background: string;
        backgroundLight: string;
        border: string;
      };
    };
    systemFont: string;
    font: { body: string; heading: string };
    fontSizes: string[];
    fontSizesUpdated: {
      xs: '12px';
      sm: '14px';
      md: '16px';
      lg: '18px';
      20: '20px';
      lgx: '24px';
      lg2x: '28px';
      lg3x: '30px';
      h1: '34px';
      xl: '46px';
      '2xl': '72px';
    };
    muiBorderRadius: {
      sm: '2px';
      md: '4px';
      lg: '6px';
      xl: '10px';
      '2xl': '12px';
    };
    radii: string[];
    shadows: string[];
    breakpoints: {
      phoneOnly: string;
      tabletLandscapeDown: string;
      mdUp: string;
    };
    maxWidths: {
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
  }
}
