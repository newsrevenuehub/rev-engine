import React from 'react';
import * as Sentry from '@sentry/react';

import * as S from '../../elements/buttons/Button.styled';
import * as ErrorS from './ErrorFallback.styled';

const ChunkErrorFallback = (error, componentStack, resetError) => {
  console.log(error, componentStack, resetError);
  const chunkFailedMessage = /Loading chunk [\d]+ failed/;

  if (error?.message && chunkFailedMessage.test(error.message)) {
    // Leaving this here for testing purposes, should retry only for chunk loading errors
    console.error(error);
    resetError();
  } else {
    return (
      <>
        <ErrorS.ErrorWrapper>
          <ErrorS.ErrorHeading layout>
            <h2>😰 We've encountered a problem. Click below to reload the page</h2>
          </ErrorS.ErrorHeading>
          <ErrorS.ErrorMessage>
            <div>{error.toString()}</div>
          </ErrorS.ErrorMessage>
          <ErrorS.ErrorStack>
            <div>{componentStack}</div>
          </ErrorS.ErrorStack>
          <S.Button
            onClick={() => {
              resetError();
            }}
          >
            Reload Page
          </S.Button>
        </ErrorS.ErrorWrapper>
      </>
    );
  }
};

const ChunkErrorBoundary = (props) => {
  console.log(props);
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, componentStack, resetError }) => ChunkErrorFallback(error, componentStack, resetError)}
    >
      {props.children}
    </Sentry.ErrorBoundary>
  );
};

export default ChunkErrorBoundary;
