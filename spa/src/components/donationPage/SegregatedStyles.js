import DonationPageGlobalStyles from 'styles/DonationPageGlobalStyles';

// Util
import merge from 'lodash.merge';

// Sentry
import * as Sentry from '@sentry/react';

// Theme
import { ThemeProvider } from 'styled-components';
import { donationPageBase } from 'styles/themes';

import LiveErrorFallback from 'components/donationPage/live/LiveErrorFallback';

function SegregatedStyles({ children, page }) {
  return (
    <ThemeProvider theme={merge({}, donationPageBase, page?.styles)}>
      <DonationPageGlobalStyles />
      <Sentry.ErrorBoundary fallback={<LiveErrorFallback />}>{children}</Sentry.ErrorBoundary>
    </ThemeProvider>
  );
}

export default SegregatedStyles;
