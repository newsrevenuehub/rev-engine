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

    black: '#080708',

    white: '#ffffff',

    grey: ['#eee', '#ccc', '#999', '#666', '#333'],

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

  font: { body: "'Montserrat', sans-serif", heading: "'Montserrat', sans-serif" },

  fontSizes: ['12px', '16px', '24px', '32px', '48px', '84px', '96px'],

  radii: ['3px', '6px', '12px'],

  shadows: ['0 1px 2px 0 rgb(0 0 0 / 15%)', '0 10px 25px 0 rgb(0 0 0 / 6%)', '0 12px 25px 0 rgb(0 0 0 / 10%)'],

  breakpoints: {
    phoneOnly: 'max-width: 599px',
    tabletLandscapeDown: 'max-width: 900px'
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
  font: { body: "'Montserrat', sans-serif", heading: "'Montserrat', sans-serif" },
  colors: {
    cstm_mainHeader: revEngineTheme.colors.white,
    cstm_mainBackground: '#faf8f8',
    cstm_formPanelBackground: revEngineTheme.colors.white,
    cstm_CTAs: revEngineTheme.colors.primary,
    cstm_ornaments: '#2b2869'
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
