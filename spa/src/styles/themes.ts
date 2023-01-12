import { createTheme as createMuiTheme } from '@material-ui/core/styles';
import merge from 'lodash/merge';
import { DefaultTheme } from 'styled-components';

export const revEngineTheme: DefaultTheme = {
  colors: {
    primary: '#20bfdd',
    primaryLight: '#c7eff7',
    secondary: '#99D17B',

    fieldBackground: '#f7f7f7',
    paneBackground: '#fff',
    inputBackground: '#fff',
    inputBorder: '#c3c3c3',

    sidebarBackground: '#25192B',
    topbarBackground: '#523A5E',
    navSelectedBackground: '#eaf37a',
    navSectionLabelColor: '#ddcbe7',
    navOrgIcon: '#AC256C',

    black: '#080708',

    account: {
      purple: ['#523a5e', '#25192b', '#19111e'],
      yellow: ['#f5ff75'],
      blueLink: '#0052cc'
    },

    white: '#ffffff',

    grey: ['#eee', '#ccc', '#999', '#666', '#333'],

    muiLightBlue: {
      200: '#6FD1EC',
      500: '#3cade8',
      800: '#157CB2'
    },

    muiTeal: {
      600: '#008E7C',
      700: '#008070'
    },

    muiYellow: {
      A50: '#EFF4A7',
      A100: '#F5FF75'
    },

    muiGrey: {
      50: '#F9F9F9',
      100: '#F1F1F1',
      200: '#e3e3e3',
      300: '#D9D9D9',
      400: '#c4c4c4',
      500: '#969696',
      600: '#707070',
      700: '#666666',
      800: '#3c3c3c',
      900: '#282828'
    },

    status: {
      processing: '#ACDCF5',
      done: '#AFEFAD',
      failed: '#F4B9C8',
      warning: '#FDD69C'
    },

    error: {
      primary: '#C8203F',
      bg: '#f6dbe0'
    },

    caution: '#ff476c',
    info: '#20bfdd',
    success: '#99D17B',
    warning: '#ffd400',
    disabled: '#ebebeb',
    link: '#4183c4',

    hover: '#eee',

    tableRowHover: '#bcd3f5',
    tableRowActive: '#dce8fa'
  },

  buttons: {
    yellow: {
      background: '#F5FF75',
      backgroundLight: 'rgba(245, 255, 117, 0.3);',
      border: '0.5px solid #E6EE84',
      boxShadow: '0px 0.3px 0.5px rgba(0, 0, 0, 0.1), 0px 2px 4px rgba(0, 0, 0, 0.2)',
      borderRadius: '4px',
      color: '#302436'
    },
    blue: {
      background: '#147D99',
      backgroundLight: '#9ADFF2',
      border: '0.5px solid #147D99'
    }
  },

  systemFont: "'Roboto', sans-serif",

  font: { body: "'Roboto', sans-serif", heading: "'Roboto', sans-serif" },

  fontSizes: ['12px', '16px', '24px', '32px', '48px', '84px', '96px'],

  fontSizesUpdated: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    20: '20px',
    lgx: '24px',
    lg2x: '28px',
    lg3x: '30px',
    h1: '34px',
    xl: '46px',
    '2xl': '72px'
  },

  muiBorderRadius: {
    sm: '2px',
    md: '4px',
    lg: '6px',
    xl: '10px',
    '2xl': '12px'
  },

  radii: ['3px', '6px', '12px'],

  shadows: ['0 1px 2px 0 rgb(0 0 0 / 15%)', '0 10px 25px 0 rgb(0 0 0 / 6%)', '0 12px 25px 0 rgb(0 0 0 / 10%)'],

  breakpoints: {
    phoneOnly: 'max-width: 599px',
    tabletLandscapeDown: 'max-width: 890px',
    mdUp: 'min-width: 890px'
  },

  maxWidths: {
    sm: '300px',
    md: '890px',
    lg: '1000px',
    xl: '1300px'
  },

  zIndex: {
    header: 10,
    sidebar: 5
  }
};

export const donationPageBase = merge({}, revEngineTheme, {
  maxWidths: {
    sm: '500px',
    md: '890px',
    lg: '1100px',
    xl: '1300px'
  },
  font: { body: "'Roboto', sans-serif", heading: "'Roboto', sans-serif" },
  colors: {
    ...revEngineTheme.colors,
    cstm_mainHeader: revEngineTheme.colors.white,
    cstm_mainBackground: '#faf8f8',
    cstm_formPanelBackground: revEngineTheme.colors.white,
    cstm_CTAs: revEngineTheme.colors.primary,
    cstm_ornaments: '#2b2869',
    cstm_inputBackground: revEngineTheme.colors.white,
    cstm_inputBorder: revEngineTheme.colors.black
  }
});

export const muiThemeOverrides = createMuiTheme({
  palette: {
    primary: { main: revEngineTheme.colors.primary },
    secondary: { main: revEngineTheme.colors.primary }
  }
});

export function mapCustomStylesToMuiOverrides(styles: Partial<DefaultTheme> = {}) {
  return createMuiTheme({
    palette: {
      primary: { main: styles?.colors?.cstm_CTAs ?? revEngineTheme.colors.primary },
      secondary: { main: styles?.colors?.cstm_CTAs ?? revEngineTheme.colors.primary }
    }
  });
}
