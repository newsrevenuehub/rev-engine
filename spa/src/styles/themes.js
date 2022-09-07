import merge from 'lodash/merge';
import { createTheme as createMuiTheme } from '@material-ui/core/styles';

export const revEngineTheme = {
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

    black: '#080708',

    account: {
      purple: ['#523a5e', '#25192b', '#19111e'],
      yellow: ['#f5ff75'],
      blueLink: '#0052cc'
    },

    buttons: {
      yellow: {
        background: '#f5ff75',
        border: '0.5px solid #e6ee84',
        boxShadow: '0px 0.3px 0.5px rgba(0, 0, 0, 0.1), 0px 2px 4px rgba(0, 0, 0, 0.2)'
      }
    },

    white: '#ffffff',

    grey: ['#eee', '#ccc', '#999', '#666', '#333', '#282828'],

    muiLightBlue: {
      200: '#6FD1EC',
      500: '#3cade8',
      800: '#157CB2'
    },

    muiTeal: {
      700: '#008070'
    },

    muiGrey: {
      100: '#F1F1F1',
      300: '#D9D9D9',
      600: '#707070',
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

  systemFont: "'Roboto', sans-serif",

  font: { body: "'Roboto', sans-serif", heading: "'Roboto', sans-serif" },

  fontSizes: ['12px', '16px', '24px', '32px', '48px', '84px', '96px'],

  fontSizesUpdated: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    h1: '34px'
  },

  muiBorderRadius: {
    sm: '2px',
    md: '4px',
    lg: '6px'
  },

  radii: ['3px', '6px', '12px'],

  shadows: ['0 1px 2px 0 rgb(0 0 0 / 15%)', '0 10px 25px 0 rgb(0 0 0 / 6%)', '0 12px 25px 0 rgb(0 0 0 / 10%)'],

  breakpoints: {
    phoneOnly: 'max-width: 599px',
    mdDown: 'max-width: 890px',
    mdUp: 'min-width: 890px'
  },

  maxWidths: {
    sm: '300px',
    md: '890px',
    lg: '1000px',
    xl: '1300px'
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

export function mapCustomStylesToMuiOverrides(styles = {}) {
  return createMuiTheme({
    palette: {
      primary: { main: styles?.colors?.cstm_CTAs || revEngineTheme.colors.primary },
      secondary: { main: styles?.colors?.cstm_CTAs || revEngineTheme.colors.primary }
    }
  });
}
