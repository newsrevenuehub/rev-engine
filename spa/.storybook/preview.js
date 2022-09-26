import { withThemes } from '@react-theming/storybook-addon';
import { ThemeProvider as MuiThemeProvider } from '@material-ui/core';
import { ThemeProvider } from 'styled-components';
import { Provider as AlertProvider } from 'react-alert';

import Alert, { alertOptions } from 'elements/alert/Alert';
import { revEngineTheme, muiThemeOverrides } from 'styles/themes';
import AdminGlobalStyles from 'styles/AdminGlobalStyles.js';

const providerFn = ({ children }) => (
  <ThemeProvider theme={revEngineTheme}>
    <MuiThemeProvider theme={muiThemeOverrides}>
      <AlertProvider template={Alert} {...alertOptions}>
        <AdminGlobalStyles />
        {children}
      </AlertProvider>
    </MuiThemeProvider>
  </ThemeProvider>
);

export const decorators = [withThemes(null, [revEngineTheme], { providerFn })];

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  backgrounds: {
    values: [
      { name: 'White', value: '#FFFFFF' },
      { name: 'Header color', value: '#523A5E' }
    ]
  },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/
    }
  },
  options: {
    storySort: {
      method: 'alphabetical'
    }
  },
  // this prevents circular reference that breaks storybook on form submission
  // https://github.com/storybookjs/storybook/issues/12747
  docs: { source: { type: 'code' } }
};
