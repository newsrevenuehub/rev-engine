import DonationPageGlobalStyles from 'styles/DonationPageGlobalStyles';

// Util
import merge from 'lodash.merge';

// Sentry
import * as Sentry from '@sentry/react';

// Theme
import { ThemeProvider } from 'styled-components';
import { donationPageBase, mapCustomStylesToMuiOverrides } from 'styles/themes';
import { ThemeProvider as MuiThemeProvider } from '@material-ui/core';

import LiveErrorFallback from 'components/donationPage/live/LiveErrorFallback';

function SegregatedStyles({ children, page }) {
  return (
    <ThemeProvider theme={merge({}, donationPageBase, page?.styles)}>
      <MuiThemeProvider theme={mapCustomStylesToMuiOverrides(page?.styles)}>
        <DonationPageGlobalStyles />
        <Sentry.ErrorBoundary fallback={<LiveErrorFallback />}>{children}</Sentry.ErrorBoundary>
      </MuiThemeProvider>
    </ThemeProvider>
  );
}

export default SegregatedStyles;
