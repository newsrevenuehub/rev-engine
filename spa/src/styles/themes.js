export const baseTheme = {
  colors: {
    primary: '#0cc0dd',
    primaryLight: '#c7eff7',
    secondary: '#99D17B',

    fieldBackground: '#eef2f8',
    paneBackground: '#fff',

    black: '#080708',

    white: '#fff',

    grey: ['#eee', '#ccc', '#999', '#666', '#333'],

    caution: '#ff476c',
    info: '#0cc0dd',
    success: '#99D17B',
    warning: '#ff476c',
    disabled: 'grey'
  },

  fonts: {
    heading: 'Courier New, monospace',
    subheading: 'Courier New, monospace',
    body: 'Courier New, monospace'
  },

  radii: ['6px', '20px'],

  shadows: [
    '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
    '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)',
    '0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)',
    '0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22)'
  ],

  breakpoints: {
    phoneOnly: 'max-width: 599px',
    tabletLandscapeDown: 'max-width: 900px'
  }
};
