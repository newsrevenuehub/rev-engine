import React from 'react';
import { ErrorBoundary } from '@sentry/react';

import GenericErrorFallback from 'components/errors/GenericErrorFallback';

function GenericErrorBoundary({ children, fallback = GenericErrorFallback }) {
  return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>;
}

export default GenericErrorBoundary;
