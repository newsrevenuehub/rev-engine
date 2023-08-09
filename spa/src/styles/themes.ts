import { createTheme as createMuiTheme } from '@material-ui/core/styles';
import merge from 'lodash/merge';
import { DefaultTheme } from 'styled-components';

const basePalette = {
  primary: {
    brandBlue: '#60e0f9',
    chartreuse: '#f2ff59',
    engineBlue: '#157cb2',
    indigo: '#25192b',
    purple: '#523a5e'
  },
  secondary: {
    error: '#c8203f',
    hyperlink: '#0052cc',
    success: '#008e7c',
    warning: '#fa9908'
  },
  greyscale: {
    black: '#282828',
    grey1: '#707070',
    grey2: '#c4c4c4',
    grey3: '#f1f1f1',
    grey4: '#f9f9f9',
    white: '#ffffff'
  },
  chartreuse: {
    '-10': '#f3ff6a',
    '-20': '#f5ff7a',
    '-30': '#f6ff8b',
    '-40': '#f7ff9b',
    '-50': '#f9ffac',
    '-60': '#faffbd',
    '-70': '#fbffcd',
    '-80': '#fcffde',
    '-90': '#feffee'
  },
  indigo: {
    '-10': '#3d2947',
    '-20': '#553963',
    '-30': '#6d4a7f',
    '-40': '#855a9b',
    '-50': '#9a73ae',
    '-60': '#ae8fbe',
    '-70': '#c3abce',
    '-80': '#d7c7de',
    '-90': '#ebe3ef'
  },
  purple: {
    '-10': '#654874',
    '-20': '#79558a',
    '-30': '#8c649f',
    '-40': '#9c7aad',
    '-50': '#ad90bb',
    '-60': '#bda6c8',
    '-70': '#cebdd6',
    '-80': '#ded3e4',
    '-90': '#efe9f1'
  }
};

export const revEngineTheme: DefaultTheme = {
  basePalette: basePalette as DefaultTheme['basePalette'],
  colors: {
    primary: '#20bfdd',
    primaryLight: '#c7eff7',
    secondary: '#99D17B',

    fieldBackground: '#f7f7f7',
    paneBackground: basePalette.greyscale.white as '#ffffff',
    inputBackground: basePalette.greyscale.white as '#ffffff',
    inputBorder: '#c3c3c3',

    sidebarBackground: basePalette.primary.indigo as '#25192b',
    topbarBackground: basePalette.primary.purple as '#523a5e',
    navSelectedBackground: '#eaf37a',
    navSectionLabelColor: '#ddcbe7',
    navOrgIcon: '#AC256C',

    black: '#080708',

    account: {
      purple: ['#523a5e', basePalette.primary.indigo as '#25192b', '#19111e'],
      yellow: ['#f5ff75'],
      blueLink: basePalette.secondary.hyperlink as '#0052cc'
    },

    white: basePalette.greyscale.white as '#ffffff',

    grey: ['#eee', '#ccc', '#999', '#666', '#333'],

    muiLightBlue: {
      200: '#6FD1EC',
      500: '#3cade8',
      800: basePalette.primary.engineBlue as '#157cb2'
    },

    muiTeal: {
      600: basePalette.secondary.success as '#008e7c',
      700: '#008070'
    },

    muiYellow: {
      A50: '#EFF4A7',
      A100: '#F5FF75'
    },

    muiGrey: {
      50: basePalette.greyscale.grey4 as '#f9f9f9',
      100: basePalette.greyscale.grey3 as '#f1f1f1',
      200: '#e3e3e3',
      300: '#D9D9D9',
      400: basePalette.greyscale.grey2 as '#c4c4c4',
      450: '#a7a7a7',
      500: '#969696',
      600: basePalette.greyscale.grey1 as '#707070',
      700: '#666666',
      800: '#3c3c3c',
      900: basePalette.greyscale.black as '#282828'
    },

    status: {
      processing: '#ACDCF5',
      done: '#AFEFAD',
      failed: '#F4B9C8',
      warning: '#FDD69C'
    },

    error: {
      primary: basePalette.secondary.error as '#c8203f',
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

  plan: {
    free: {
      background: basePalette.primary.chartreuse as '#f2ff59'
    },
    core: {
      background: '#62ffe3'
    },
    plus: {
      background: '#f323ff'
    }
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
    '2xl': '12px',
    14: '14px',
    19: '19px'
  },

  radii: ['5px', '10px', '20px'],

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
