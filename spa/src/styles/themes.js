export const adminTheme = {
  colors: {
    primary: '#20bfdd',
    primaryLight: '#c7eff7',
    secondary: '#99D17B',

    fieldBackground: '#f7f7f7',
    paneBackground: '#fff',
    inputBackground: '#e4f0f3',
    inputBorder: '#e2eef0',

    black: '#080708',

    white: '#fff',

    grey: ['#eee', '#ccc', '#999', '#666', '#333'],

    hubBlue: '#20bfdd',
    caution: '#ff476c',
    info: '#20bfdd',
    success: '#99D17B',
    warning: '#ff476c',
    disabled: 'grey',

    hover: '#eee'
  },

  fonts: {
    heading: 'Courier New, monospace',
    subheading: 'Courier New, monospace',
    body: 'Courier New, monospace'
  },

  radii: ['3px', '6px', '20px'],

  shadows: [
    '0 1px 2px 0 rgb(0 0 0 / 15%)',
    '0 10px 25px 0 rgb(0 0 0 / 6%)'
    // '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    // '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
    // '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)',
    // '0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)',
    // '0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22)'
  ],

  breakpoints: {
    phoneOnly: 'max-width: 599px',
    tabletLandscapeDown: 'max-width: 900px'
  },

  maxWidths: {
    sm: '300px',
    md: '700px',
    lg: '1000px'
  }
};

export const donationPageBase = {
  colors: {
    ...adminTheme.colors,
    fieldBackground: '#fff'
  },

  fonts: {
    heading: 'Arial',
    subheading: 'Arial',
    body: 'Arial'
  },

  breakpoints: {
    phoneOnly: 'max-width: 599px',
    tabletLandscapeDown: 'max-width: 900px'
  },

  maxWidths: {
    sm: '300px',
    md: '890px',
    lg: '1100px'
  }
};
