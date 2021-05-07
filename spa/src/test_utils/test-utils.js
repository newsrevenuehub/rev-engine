/* istanbul ignore file */
import { render } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';

import { baseTheme } from 'styles/themes';

const AllTheProviders = ({ children }) => {
  return <ThemeProvider theme={baseTheme}>{children}</ThemeProvider>;
};

const customRender = (ui, options) => render(ui, { wrapper: AllTheProviders, ...options });

// re-export everything
export * from '@testing-library/react';

// override render method
export { customRender as render };
