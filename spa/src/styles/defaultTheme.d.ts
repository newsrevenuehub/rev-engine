// This extends Styled Components's theme with our own properties. TODO: make
// this easier to use. It's currently a reflection of the ad hoc nature of our
// theme currently.
// See https://styled-components.com/docs/api#typescript

import 'styled-components';

declare module 'styled-components' {
  export interface BasePalette {
    primary: {
      brandBlue: '#60e0f9';
      chartreuse: '#f2ff59';
      engineBlue: '#157cb2';
      indigo: '#25192b';
      purple: '#523a5e';
    };
    secondary: {
      error: '#c8203f';
      hyperlink: '#0052cc';
      success: '#008e7c';
      warning: '#fa9908';
    };
    greyscale: {
      black: '#282828';
      '90': '#3d3d3d';
      '80': '#535353';
      '70': '#707070';
      '60': '#808080';
      '50': '#989898';
      '40': '#b1b1b1';
      '30': '#c4c4c4';
      '20': '#e4e4e4';
      '10': '#f1f1f1';
      white: '#ffffff';
    };
    chartreuse: {
      '-10': '#f3ff6a';
      '-20': '#f5ff7a';
      '-30': '#f6ff8b';
      '-40': '#f7ff9b';
      '-50': '#f9ffac';
      '-60': '#faffbd';
      '-70': '#fbffcd';
      '-80': '#fcffde';
      '-90': '#feffee';
    };
    indigo: {
      '-10': '#3d2947';
      '-20': '#553963';
      '-30': '#6d4a7f';
      '-40': '#855a9b';
      '-50': '#9a73ae';
      '-60': '#ae8fbe';
      '-70': '#c3abce';
      '-80': '#d7c7de';
      '-90': '#ebe3ef';
    };
    purple: {
      '-10': '#654874';
      '-20': '#79558a';
      '-30': '#8c649f';
      '-40': '#9c7aad';
      '-50': '#ad90bb';
      '-60': '#bda6c8';
      '-70': '#cebdd6';
      '-80': '#ded3e4';
      '-90': '#efe9f1';
    };
    red: {
      '-10': '#c5203e';
      '-20': '#cf4451';
      '-30': '#d95f64';
      '-40': '#e17779';
      '-50': '#e98e8e';
      '-60': '#efa5a3';
      '-70': '#f5bbb9';
      '-80': '#f9d2d0';
      '-90': '#fde8e7';
    };
  }

  export interface DefaultTheme {
    basePalette: BasePalette;
    colors: {
      cstm_formPanelBackground?: string;
      cstm_inputBackground?: string;
      cstm_inputBorder?: string;
      cstm_mainBackground?: string;
      cstm_mainHeader?: string;
      cstm_ornaments?: string;
      primary: '#20bfdd';
      primaryLight: '#c7eff7';
      secondary: '#99D17B';
      fieldBackground: '#f7f7f7';
      paneBackground: BasePalette['greyscale']['white'];
      inputBackground: BasePalette['greyscale']['white'];
      inputBorder: '#c3c3c3';
      sidebarBackground: BasePalette['primary']['indigo'];
      topbarBackground: BasePalette['primary']['purple'];
      navSelectedBackground: '#eaf37a';
      navSectionLabelColor: '#ddcbe7';
      navOrgIcon: '#AC256C';
      black: '#080708';
      account: {
        purple: ['#523a5e', BasePalette['primary']['indigo'], '#19111e'];
        yellow: ['#f5ff75'];
        blueLink: BasePalette['secondary']['hyperlink'];
      };
      white: BasePalette['greyscale']['white'];
      grey: ['#eee', '#ccc', '#999', '#666', '#333'];
      muiLightBlue: {
        200: '#6FD1EC';
        500: '#3cade8';
        800: BasePalette['primary']['engineBlue'];
      };
      muiTeal: {
        600: BasePalette['secondary']['success'];
        700: '#008070';
      };
      muiYellow: {
        A50: '#EFF4A7';
        A100: '#F5FF75';
      };
      muiGrey: {
        50: BasePalette['greyscale']['grey4'];
        100: BasePalette['greyscale']['grey3'];
        200: '#e3e3e3';
        300: '#D9D9D9';
        400: BasePalette['greyscale']['grey2'];
        450: '#a7a7a7';
        500: '#969696';
        600: BasePalette['greyscale']['grey1'];
        700: '#666666';
        800: '#3c3c3c';
        900: BasePalette['greyscale']['black'];
      };
      status: {
        processing: '#ACDCF5';
        done: '#AFEFAD';
        failed: '#F4B9C8';
        warning: '#FDD69C';
      };
      error: {
        primary: BasePalette['secondary']['error'];
        bg: '#f6dbe0';
      };
      caution: '#ff476c';
      info: '#20bfdd';
      success: '#99D17B';
      warning: '#ffd400';
      disabled: '#ebebeb';
      link: '#4183c4';
      hover: '#eee';
      tableRowHover: '#bcd3f5';
      tableRowActive: '#dce8fa';
      cstm_CTAs?: string;
    };
    plan: {
      free: {
        background: BasePalette['primary']['chartreuse'];
      };
      core: {
        background: '#62ffe3';
      };
      plus: {
        background: '#f323ff';
      };
    };
    buttons: {
      yellow: {
        background: '#F5FF75';
        backgroundLight: 'rgba(245, 255, 117, 0.3);';
        border: '0.5px solid #E6EE84';
        boxShadow: '0px 0.3px 0.5px rgba(0, 0, 0, 0.1), 0px 2px 4px rgba(0, 0, 0, 0.2)';
        borderRadius: '4px';
        color: '#302436';
      };
      blue: {
        background: '#147D99';
        backgroundLight: '#9ADFF2';
        border: '0.5px solid #147D99';
      };
    };
    systemFont: "'Roboto', sans-serif";
    font: { body: "'Roboto', sans-serif"; heading: "'Roboto', sans-serif" };
    fontSizes: ['12px', '16px', '24px', '32px', '48px', '84px', '96px'];
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
      14: '14px';
      19: '19px';
    };
    radii: ['5px', '10px', '20px'];
    shadows: ['0 1px 2px 0 rgb(0 0 0 / 15%)', '0 10px 25px 0 rgb(0 0 0 / 6%)', '0 12px 25px 0 rgb(0 0 0 / 10%)'];
    breakpoints: {
      phoneOnly: 'max-width: 599px';
      tabletLandscapeDown: 'max-width: 890px';
      mdUp: 'min-width: 890px';
    };
    maxWidths: {
      sm: '300px';
      md: '890px';
      lg: '1000px';
      xl: '1300px';
    };
    zIndex: {
      header: 10;
      notifications: 1500;
      sidebar: 5;
    };
  }
}
