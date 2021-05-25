import React from 'react';
import DonationPageGlobalStyles from 'styles/DonationPageGlobalStyles';

// Sentry
import * as Sentry from '@sentry/react';

// Theme
import { ThemeProvider } from 'styled-components';
import { donationPageBase } from 'styles/themes';

import LiveErrorFallback from 'components/donationPage/live/LiveErrorFallback';

function SegregatedStyles({ children }) {
  return (
    <ThemeProvider theme={donationPageBase}>
      <DonationPageGlobalStyles />
      <Sentry.ErrorBoundary fallback={<LiveErrorFallback />}>{children}</Sentry.ErrorBoundary>
    </ThemeProvider>
  );
}

export default SegregatedStyles;
