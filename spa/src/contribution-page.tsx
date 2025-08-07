// This is the main entrypoint for contribution pages.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode, Suspense } from 'react';
import ReactDOM from 'react-dom';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import { DefaultTheme, ThemeProvider } from 'styled-components';
import { HUB_RECAPTCHA_API_KEY } from 'appSettings';
import ContributionPage from './contributionPage/ContributionPage';
import './i18n';

const queryClient = new QueryClient();

// Shimming things from themes.ts.

const theme: DefaultTheme = {
  colors: {
    cstm_mainHeader: '#fff'
  },
  shadows: ['0 1px 2px 0 rgb(0 0 0 / 15%)']
} as any;

ReactDOM.render(
  <StrictMode>
    <Suspense fallback="Loading...">
      <ThemeProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <GoogleReCaptchaProvider reCaptchaKey={HUB_RECAPTCHA_API_KEY}>
            <ContributionPage />
          </GoogleReCaptchaProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </Suspense>
  </StrictMode>,
  document.getElementById('root')
);
